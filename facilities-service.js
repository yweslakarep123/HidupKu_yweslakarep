import axios from 'axios';

class FacilitiesService {
    constructor() {
        this.googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
        this.baseUrl = 'https://maps.googleapis.com/maps/api';
    }

    // Geocoding: Konversi alamat ke koordinat menggunakan Google Geocoding API
    async getCoordinatesFromAddress(address) {
        try {
            const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                params: {
                    address: address,
                    key: this.googlePlacesApiKey
                }
            });
            if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
                const location = response.data.results[0].geometry.location;
                return {
                    lat: location.lat,
                    lng: location.lng,
                    formatted_address: response.data.results[0].formatted_address
                };
            } else if (response.data.status === 'ZERO_RESULTS') {
                const cityName = address.split(',')[0].trim();
                const cityResponse = await axios.get(`${this.baseUrl}/geocode/json`, {
                    params: {
                        address: cityName,
                        key: this.googlePlacesApiKey
                    }
                });
                if (cityResponse.data.status === 'OK' && cityResponse.data.results && cityResponse.data.results.length > 0) {
                    const location = cityResponse.data.results[0].geometry.location;
                    return {
                        lat: location.lat,
                        lng: location.lng,
                        formatted_address: cityResponse.data.results[0].formatted_address
                    };
                }
            }
            throw new Error(`Address not found. Status: ${response.data.status}`);
        } catch (error) {
            console.error('Error getting coordinates:', error.message);
            throw new Error('Gagal mendapatkan koordinat dari alamat');
        }
    }

    // Pencarian fasilitas kesehatan menggunakan Google Places API
    async searchHealthcareFacilities(lat, lng, radius = 10000, type = null) {
        try {
            const facilities = [];
            const types = type ? [type] : ['hospital', 'pharmacy', 'health'];
            for (const facilityType of types) {
                const response = await axios.get(`${this.baseUrl}/place/nearbysearch/json`, {
                    params: {
                        location: `${lat},${lng}`,
                        radius: radius,
                        type: facilityType,
                        keyword: 'healthcare medical',
                        key: this.googlePlacesApiKey
                    }
                });
                if (response.data.status === 'OK') {
                    for (const place of response.data.results) {
                        const distance = this.calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);
                        const facilityType = this.determineFacilityType(place.types, place.name);
                        facilities.push({
                            id: place.place_id,
                            name: place.name,
                            type: facilityType,
                            address: place.vicinity,
                            distance: Number(distance.toFixed(2)),
                            rating: place.rating || null,
                            user_ratings_total: place.user_ratings_total || 0,
                            geometry: place.geometry.location,
                            types: place.types,
                            open_now: place.opening_hours?.open_now || null,
                            phone: place.formatted_phone_number || null
                        });
                    }
                }
            }
            const uniqueFacilities = this.removeDuplicates(facilities);
            return uniqueFacilities.sort((a, b) => a.distance - b.distance);
        } catch (error) {
            console.error('Error searching facilities:', error.message);
            throw new Error('Gagal mencari fasilitas kesehatan');
        }
    }

    // Main method to search facilities
    async searchFacilities(address = null, userLat = null, userLng = null, typeFilter = null, maxDistance = 10) {
        try {
            let coordinates;
            if (userLat && userLng) {
                coordinates = {
                    lat: userLat,
                    lng: userLng,
                    formatted_address: 'Lokasi saat ini'
                };
            } else if (address) {
                coordinates = await this.getCoordinatesFromAddress(address);
            } else {
                throw new Error('Lokasi tidak ditemukan');
            }
            const facilities = await this.searchHealthcareFacilities(
                coordinates.lat,
                coordinates.lng,
                maxDistance * 1000,
                typeFilter
            );
            const filteredFacilities = this.filterFacilities(facilities, typeFilter, maxDistance);
            const facilitiesWithLinks = filteredFacilities.map(facility => ({
                ...facility,
                navigation_links: this.generateNavigationLinks(
                    facility.geometry.lat,
                    facility.geometry.lng,
                    facility.name
                )
            }));
            return {
                user_location: coordinates,
                facilities: facilitiesWithLinks.slice(0, 20),
                total_found: facilitiesWithLinks.length
            };
        } catch (error) {
            console.error('Error in searchFacilities:', error.message);
            return {
                user_location: null,
                facilities: [],
                total_found: 0,
                error: error.message
            };
        }
    }

    // Utility: determine facility type
    determineFacilityType(types, name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('rumah sakit') || nameLower.includes('rs ') || nameLower.includes('hospital')) {
            return 'hospital';
        }
        if (nameLower.includes('apotek') || nameLower.includes('pharmacy') || nameLower.includes('drugstore')) {
            return 'pharmacy';
        }
        if (nameLower.includes('puskesmas') || nameLower.includes('health center')) {
            return 'health_center';
        }
        if (nameLower.includes('klinik') || nameLower.includes('clinic')) {
            return 'clinic';
        }
        if (types.includes('hospital')) {
            return 'hospital';
        }
        if (types.includes('pharmacy') || types.includes('drugstore')) {
            return 'pharmacy';
        }
        if (types.includes('health')) {
            return 'health_center';
        }
        return 'clinic';
    }

    // Utility: remove duplicate facilities based on place_id
    removeDuplicates(facilities) {
        const seen = new Set();
        return facilities.filter(facility => {
            if (seen.has(facility.id)) {
                return false;
            }
            seen.add(facility.id);
            return true;
        });
    }

    // Utility: filter facilities by type and distance
    filterFacilities(facilities, typeFilter, maxDistance) {
        return facilities.filter(facility => {
            const typeMatch = !typeFilter || facility.type === typeFilter;
            const distanceMatch = facility.distance <= maxDistance;
            return typeMatch && distanceMatch;
        });
    }

    // Utility: calculate distance between two points (Haversine)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Utility: generate navigation links
    generateNavigationLinks(lat, lng, facilityName) {
        const encodedName = encodeURIComponent(facilityName);
        const coordinates = `${lat},${lng}`;
        return {
            google_maps: `https://www.google.com/maps/search/?api=1&query=${coordinates}(${encodedName})`,
            openstreetmap: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`
        };
    }
}

export default FacilitiesService; 