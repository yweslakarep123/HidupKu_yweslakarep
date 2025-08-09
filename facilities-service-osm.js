import axios from 'axios';

class FacilitiesServiceOSM {
    constructor() {
        this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
        this.overpassBaseUrl = 'https://overpass-api.de/api/interpreter';
    }

    // Geocoding: Konversi alamat ke koordinat menggunakan Nominatim
    async getCoordinatesFromAddress(address) {
        try {
            console.log('🔍 Geocoding address (OSM):', address);
            
            // Add delay to respect rate limiting
            await this.delay(1000);

            const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
                params: {
                    q: address,
                    format: 'json',
                    limit: 1,
                    countrycodes: 'id',
                    addressdetails: 1
                },
                headers: {
                    'User-Agent': 'HidupKu-HealthApp/1.0'
                },
                timeout: 10000 // 10 detik timeout
            });

            if (response.data && response.data.length > 0) {
                const location = response.data[0];
                const coordinates = {
                    lat: parseFloat(location.lat),
                    lng: parseFloat(location.lon),
                    formatted_address: location.display_name
                };
                console.log('✅ Geocoding success (OSM):', coordinates);
                return coordinates;
            } else {
                // Fallback: coba dengan nama kota saja
                const cityName = address.split(',')[0].trim();
                console.log('🔄 Fallback geocoding with city name:', cityName);
                await this.delay(1000); // Delay untuk rate limiting
                
                const cityResponse = await axios.get(`${this.nominatimBaseUrl}/search`, {
                    params: {
                        q: cityName,
                        format: 'json',
                        limit: 1,
                        countrycodes: 'id'
                    },
                    headers: {
                        'User-Agent': 'HidupKu-HealthApp/1.0'
                    },
                    timeout: 10000
                });

                if (cityResponse.data && cityResponse.data.length > 0) {
                    const location = cityResponse.data[0];
                    const coordinates = {
                        lat: parseFloat(location.lat),
                        lng: parseFloat(location.lon),
                        formatted_address: location.display_name
                    };
                    console.log('✅ Fallback geocoding success (OSM):', coordinates);
                    return coordinates;
                }
            }
            throw new Error('Address not found');
        } catch (error) {
            console.error('❌ Error getting coordinates (OSM):', error.message);
            if (error.code === 'ECONNABORTED') {
                throw new Error('Timeout saat mencari alamat');
            }
            throw new Error('Gagal mendapatkan koordinat dari alamat');
        }
    }

    // Helper function untuk delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Pencarian fasilitas kesehatan menggunakan Overpass API
    async searchHealthcareFacilities(lat, lng, radius = 10000) {
        try {
            console.log('🏥 Searching healthcare facilities (OSM):', {
                lat,
                lng,
                radius: radius / 1000 + 'km'
            });
            
            const facilities = [];
            const searchRadius = Math.min(radius, 5000); // Overpass limit

            // Query untuk mencari fasilitas kesehatan - lebih efisien
            const query = `
                [out:json][timeout:30];
                (
                    node["amenity"~"^(hospital|pharmacy|clinic|doctors|dentist|veterinary)$"](around:${searchRadius},${lat},${lng});
                    way["amenity"~"^(hospital|pharmacy|clinic|doctors|dentist|veterinary)$"](around:${searchRadius},${lat},${lng});
                );
                out body;
                >;
                out skel qt;
            `;

            console.log('📡 Sending Overpass query...');
            const response = await axios.post(this.overpassBaseUrl, query, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000 // 30 detik timeout
            });

            if (response.data && response.data.elements) {
                console.log(`📊 Found ${response.data.elements.length} elements from Overpass API`);
                
                // Log sample element untuk debugging
                if (response.data.elements.length > 0) {
                    console.log('🔍 Sample element structure:', {
                        type: response.data.elements[0].type,
                        id: response.data.elements[0].id,
                        hasTags: !!response.data.elements[0].tags,
                        tags: response.data.elements[0].tags
                    });
                }
                
                for (const element of response.data.elements) {
                    if (element.type === 'node' || element.type === 'way') {
                        const facility = await this.processFacilityElement(element, lat, lng);
                        if (facility) {
                            facilities.push(facility);
                        }
                    }
                }
            }

            // Remove duplicates dan sort by distance
            const uniqueFacilities = this.removeDuplicates(facilities);
            const sortedFacilities = uniqueFacilities.sort((a, b) => a.distance - b.distance);
            
            console.log(`✅ Healthcare facilities search complete (OSM): ${sortedFacilities.length} facilities found`);
            return sortedFacilities;
        } catch (error) {
            console.error('❌ Error searching facilities (OSM):', error.message);
            return [];
        }
    }

    // Memproses elemen fasilitas dari Overpass API
    async processFacilityElement(element, userLat, userLng) {
        try {
            // Validasi element dan tags
            if (!element || !element.tags) {
                console.log('⚠️ Skipping element without tags:', element);
                return null;
            }

            let lat, lng, name, address;

            if (element.type === 'node') {
                lat = element.lat;
                lng = element.lon;
            } else if (element.type === 'way') {
                // Untuk way, gunakan koordinat user sebagai fallback
                // karena way tidak memiliki koordinat langsung
                lat = userLat;
                lng = userLng;
            } else {
                console.log('⚠️ Skipping element with unknown type:', element.type);
                return null; // Skip elements yang bukan node atau way
            }

            // Get facility details using Nominatim reverse geocoding
            try {
                await this.delay(500); // Rate limiting untuk Nominatim
                
                const detailsResponse = await axios.get(`${this.nominatimBaseUrl}/reverse`, {
                    params: {
                        format: 'json',
                        lat: lat,
                        lon: lng,
                        addressdetails: 1
                    },
                    headers: {
                        'User-Agent': 'HidupKu-HealthApp/1.0'
                    },
                    timeout: 5000
                });

                if (detailsResponse.data) {
                    name = detailsResponse.data.display_name.split(',')[0];
                    address = detailsResponse.data.display_name;
                } else {
                    name = 'Fasilitas Kesehatan';
                    address = `${lat}, ${lng}`;
                }
            } catch (error) {
                // Fallback jika reverse geocoding gagal
                name = element.tags.name || 'Fasilitas Kesehatan';
                address = `${lat}, ${lng}`;
            }

            const distance = this.calculateDistance(userLat, userLng, lat, lng);
            const facilityType = this.determineFacilityType(element.tags);

            return {
                id: element.id,
                name: name,
                type: facilityType,
                address: address,
                distance: Number(distance.toFixed(2)),
                rating: null, // OSM tidak menyediakan rating
                user_ratings_total: 0,
                geometry: { lat, lng },
                types: element.tags.amenity ? [element.tags.amenity] : [],
                open_now: null,
                phone: element.tags.phone || null
            };
        } catch (error) {
            console.error('❌ Error processing facility element:', error.message);
            return null;
        }
    }

    // Menentukan tipe fasilitas berdasarkan tags OSM
    determineFacilityType(tags) {
        if (!tags || !tags.amenity) {
            console.log('⚠️ No amenity tag found, using default type');
            return 'healthcare';
        }

        switch (tags.amenity) {
            case 'hospital':
                return 'hospital';
            case 'pharmacy':
                return 'pharmacy';
            case 'clinic':
                return 'clinic';
            case 'doctors':
                return 'clinic';
            case 'dentist':
                return 'clinic';
            case 'veterinary':
                return 'veterinary';
            default:
                console.log('⚠️ Unknown amenity type:', tags.amenity);
                return 'healthcare';
        }
    }

    // Menghitung jarak antara dua titik koordinat
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radius bumi dalam kilometer
        const dLat = this.deg2rad(lat2 - lat1);
        const dLng = this.deg2rad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    // Menghapus duplikat fasilitas
    removeDuplicates(facilities) {
        const seen = new Set();
        return facilities.filter(facility => {
            const key = `${facility.name}-${facility.address}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    // Filter fasilitas berdasarkan tipe dan jarak
    filterFacilities(facilities, typeFilter, maxDistance) {
        return facilities.filter(facility => {
            const distanceMatch = facility.distance <= maxDistance;
            const typeMatch = !typeFilter || facility.type === typeFilter;
            return distanceMatch && typeMatch;
        });
    }

    // Generate navigation links
    generateNavigationLinks(lat, lng, name) {
        const encodedName = encodeURIComponent(name);
        return {
            google_maps: `https://www.google.com/maps/search/${encodedName}/@${lat},${lng},15z`,
            openstreetmap: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`,
            waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        };
    }

    // Main method to search facilities
    async searchFacilities(address = null, userLat = null, userLng = null, typeFilter = null, maxDistance = 10) {
        try {
            console.log('🚀 Starting facilities search (OSM):', {
                address,
                userLat,
                userLng,
                typeFilter,
                maxDistance
            });
            
            let coordinates;
            if (userLat && userLng) {
                coordinates = {
                    lat: userLat,
                    lng: userLng,
                    formatted_address: 'Lokasi saat ini'
                };
                console.log('📍 Using provided coordinates:', coordinates);
            } else if (address) {
                coordinates = await this.getCoordinatesFromAddress(address);
            } else {
                throw new Error('Lokasi tidak ditemukan');
            }

            const facilities = await this.searchHealthcareFacilities(
                coordinates.lat,
                coordinates.lng,
                maxDistance * 1000
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

            const result = {
                user_location: coordinates,
                facilities: facilitiesWithLinks.slice(0, 20),
                total_found: facilitiesWithLinks.length
            };
            
            console.log('🎉 Facilities search completed (OSM):', {
                coordinates: result.user_location,
                total_found: result.total_found,
                facilities_returned: result.facilities.length
            });
            
            return result;
        } catch (error) {
            console.error('❌ Error in searchFacilities (OSM):', error.message);
            return {
                user_location: null,
                facilities: [],
                total_found: 0,
                error: error.message
            };
        }
    }
}

export default FacilitiesServiceOSM;
