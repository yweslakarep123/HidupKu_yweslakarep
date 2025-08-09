import axios from 'axios';

class FacilitiesServiceOSMFast {
    constructor() {
        this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
        this.overpassBaseUrl = 'https://overpass-api.de/api/interpreter';
    }

    // Geocoding: Konversi alamat ke koordinat menggunakan Nominatim (tanpa delay)
    async getCoordinatesFromAddress(address) {
        try {
            console.log('🔍 Geocoding address (OSM Fast):', address);

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
                timeout: 5000 // 5 detik timeout
            });

            if (response.data && response.data.length > 0) {
                const location = response.data[0];
                const coordinates = {
                    lat: parseFloat(location.lat),
                    lng: parseFloat(location.lon),
                    formatted_address: location.display_name
                };
                console.log('✅ Geocoding success (OSM Fast):', coordinates);
                return coordinates;
            } else {
                // Fallback: coba dengan nama kota saja
                const cityName = address.split(',')[0].trim();
                console.log('🔄 Fallback geocoding with city name:', cityName);
                
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
                    timeout: 5000
                });

                if (cityResponse.data && cityResponse.data.length > 0) {
                    const location = cityResponse.data[0];
                    const coordinates = {
                        lat: parseFloat(location.lat),
                        lng: parseFloat(location.lon),
                        formatted_address: location.display_name
                    };
                    console.log('✅ Fallback geocoding success (OSM Fast):', coordinates);
                    return coordinates;
                }
            }
            throw new Error('Address not found');
        } catch (error) {
            console.error('❌ Error getting coordinates (OSM Fast):', error.message);
            if (error.code === 'ECONNABORTED') {
                throw new Error('Timeout saat mencari alamat');
            }
            throw new Error('Gagal mendapatkan koordinat dari alamat');
        }
    }

    // Pencarian fasilitas kesehatan menggunakan Overpass API (tanpa reverse geocoding)
    async searchHealthcareFacilities(lat, lng, radius = 10000) {
        try {
            console.log('🏥 Searching healthcare facilities (OSM Fast):', {
                lat,
                lng,
                radius: radius / 1000 + 'km'
            });
            
            const facilities = [];
            const searchRadius = Math.min(radius, 3000); // Kurangi radius untuk kecepatan

            // Query yang lebih sederhana dan cepat
            const query = `
                [out:json][timeout:15];
                (
                    node["amenity"="hospital"](around:${searchRadius},${lat},${lng});
                    node["amenity"="pharmacy"](around:${searchRadius},${lat},${lng});
                    node["amenity"="clinic"](around:${searchRadius},${lat},${lng});
                );
                out body;
            `;

            console.log('📡 Sending Overpass query (Fast)...');
            const response = await axios.post(this.overpassBaseUrl, query, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 15000 // 15 detik timeout
            });

            if (response.data && response.data.elements) {
                console.log(`📊 Found ${response.data.elements.length} elements from Overpass API`);
                
                // Proses semua elemen sekaligus tanpa reverse geocoding
                for (const element of response.data.elements) {
                    if (element.type === 'node' && element.tags) {
                        const facility = this.processFacilityElementFast(element, lat, lng);
                        if (facility) {
                            facilities.push(facility);
                        }
                    }
                }
            }

            // Sort by distance
            const sortedFacilities = facilities.sort((a, b) => a.distance - b.distance);
            
            console.log(`✅ Healthcare facilities search complete (OSM Fast): ${sortedFacilities.length} facilities found`);
            return sortedFacilities;
        } catch (error) {
            console.error('❌ Error searching facilities (OSM Fast):', error.message);
            return [];
        }
    }

    // Memproses elemen fasilitas tanpa reverse geocoding (sangat cepat)
    processFacilityElementFast(element, userLat, userLng) {
        try {
            // Validasi element dan tags
            if (!element || !element.tags) {
                return null;
            }

            const lat = element.lat;
            const lng = element.lon;
            
            // Gunakan nama dari tags atau buat nama default
            const name = element.tags.name || 
                        element.tags['name:id'] || 
                        this.getDefaultName(element.tags.amenity);
            
            // Buat alamat sederhana dari koordinat
            const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

            const distance = this.calculateDistance(userLat, userLng, lat, lng);
            const facilityType = this.determineFacilityType(element.tags);

            return {
                id: element.id,
                name: name,
                type: facilityType,
                address: address,
                distance: Number(distance.toFixed(2)),
                rating: null,
                user_ratings_total: 0,
                geometry: { lat, lng },
                types: [element.tags.amenity],
                open_now: null,
                phone: element.tags.phone || null
            };
        } catch (error) {
            console.error('❌ Error processing facility element (Fast):', error.message);
            return null;
        }
    }

    // Helper untuk mendapatkan nama default berdasarkan tipe
    getDefaultName(amenity) {
        switch (amenity) {
            case 'hospital':
                return 'Rumah Sakit';
            case 'pharmacy':
                return 'Apotek';
            case 'clinic':
                return 'Klinik';
            case 'doctors':
                return 'Praktik Dokter';
            case 'dentist':
                return 'Praktik Dokter Gigi';
            case 'veterinary':
                return 'Praktik Dokter Hewan';
            default:
                return 'Fasilitas Kesehatan';
        }
    }

    // Menentukan tipe fasilitas berdasarkan tags OSM
    determineFacilityType(tags) {
        if (!tags || !tags.amenity) {
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

    // Main method to search facilities (versi cepat)
    async searchFacilities(address = null, userLat = null, userLng = null, typeFilter = null, maxDistance = 10) {
        try {
            console.log('🚀 Starting facilities search (OSM Fast):', {
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
                facilities: facilitiesWithLinks.slice(0, 15), // Kurangi jumlah hasil
                total_found: facilitiesWithLinks.length
            };
            
            console.log('🎉 Facilities search completed (OSM Fast):', {
                coordinates: result.user_location,
                total_found: result.total_found,
                facilities_returned: result.facilities.length
            });
            
            return result;
        } catch (error) {
            console.error('❌ Error in searchFacilities (OSM Fast):', error.message);
            return {
                user_location: null,
                facilities: [],
                total_found: 0,
                error: error.message
            };
        }
    }
}

export default FacilitiesServiceOSMFast;
