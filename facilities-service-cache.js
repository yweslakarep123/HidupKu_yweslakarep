import axios from 'axios';

class FacilitiesServiceCache {
    constructor() {
        this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
        this.overpassBaseUrl = 'https://overpass-api.de/api/interpreter';
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 menit
        this.reverseCache = new Map();
        this.locationCache = new Map();
        
        // Multiple geolocation strategies untuk akurasi maksimal
        this.locationStrategies = [
            // Strategy 1: High accuracy dengan timeout cepat
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
                name: 'high_accuracy_fast'
            },
            // Strategy 2: High accuracy dengan timeout lebih lama
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000,
                name: 'high_accuracy_normal'
            },
            // Strategy 3: Network-based (lebih cepat, kurang akurat)
            {
                enableHighAccuracy: false,
                timeout: 3000,
                maximumAge: 60000,
                name: 'network_based'
            }
        ];

        // Rate limiting untuk API calls
        this.lastApiCall = 0;
        this.minApiInterval = 1000; // 1 detik antara calls
    }

    // Rate limiter untuk API calls
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        if (timeSinceLastCall < this.minApiInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minApiInterval - timeSinceLastCall));
        }
        this.lastApiCall = Date.now();
    }

    // Enhanced location detection dengan multiple strategies
    async getCurrentLocation(forceRefresh = false) {
        try {
            // Cek cache lokasi
            if (!forceRefresh && this.locationCache.has('current')) {
                const cached = this.locationCache.get('current');
                if (Date.now() - cached.timestamp < 2 * 60 * 1000) { // Cache 2 menit saja
                    console.log('📍 Using cached location:', cached.data);
                    return cached.data;
                }
            }

            if (!navigator.geolocation) {
                throw new Error('Geolocation tidak didukung oleh browser ini');
            }

            console.log('🎯 Trying multiple location strategies...');
            
            let bestLocation = null;
            let bestAccuracy = Infinity;

            // Coba semua strategies secara parallel
            const locationPromises = this.locationStrategies.map(async (strategy, index) => {
                try {
                    console.log(`📡 Strategy ${index + 1} (${strategy.name}): Starting...`);
                    
                    const position = await new Promise((resolve, reject) => {
                        const timeoutId = setTimeout(() => {
                            reject(new Error(`Strategy ${strategy.name} timeout`));
                        }, strategy.timeout);

                        navigator.geolocation.getCurrentPosition(
                            (pos) => {
                                clearTimeout(timeoutId);
                                resolve(pos);
                            },
                            (err) => {
                                clearTimeout(timeoutId);
                                reject(err);
                            },
                            {
                                enableHighAccuracy: strategy.enableHighAccuracy,
                                timeout: strategy.timeout,
                                maximumAge: strategy.maximumAge
                            }
                        );
                    });

                    const accuracy = position.coords.accuracy;
                    console.log(`✅ Strategy ${index + 1} success: ±${accuracy}m`);
                    
                    return {
                        position,
                        accuracy,
                        strategy: strategy.name
                    };
                } catch (error) {
                    console.log(`❌ Strategy ${index + 1} (${strategy.name}) failed:`, error.message);
                    return null;
                }
            });

            // Gunakan Promise.allSettled untuk tidak menunggu yang gagal
            const results = await Promise.allSettled(locationPromises);
            
            // Pilih hasil dengan akurasi terbaik
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    const { position, accuracy, strategy } = result.value;
                    if (accuracy < bestAccuracy) {
                        bestAccuracy = accuracy;
                        bestLocation = { position, strategy };
                    }
                }
            });

            if (!bestLocation) {
                throw new Error('Semua strategi lokasi gagal');
            }

            const coordinates = {
                lat: bestLocation.position.coords.latitude,
                lng: bestLocation.position.coords.longitude,
                accuracy: bestAccuracy,
                strategy: bestLocation.strategy,
                timestamp: Date.now()
            };

            console.log(`🎉 Best location obtained via ${bestLocation.strategy}: ±${bestAccuracy}m`);

            // Cache lokasi
            this.locationCache.set('current', {
                data: coordinates,
                timestamp: Date.now()
            });

            return coordinates;

        } catch (error) {
            console.error('❌ All location strategies failed:', error.message);
            
            // Fallback: coba IP-based location sebagai last resort
            try {
                console.log('🔄 Trying IP-based location fallback...');
                const ipLocation = await this.getIPBasedLocation();
                if (ipLocation) {
                    return ipLocation;
                }
            } catch (ipError) {
                console.error('❌ IP-based location also failed:', ipError.message);
            }
            
            throw new Error('Tidak dapat mendeteksi lokasi. Pastikan GPS aktif dan izin lokasi diberikan.');
        }
    }

    // IP-based location sebagai fallback
    async getIPBasedLocation() {
        try {
            await this.waitForRateLimit();
            
            const response = await axios.get('https://ipapi.co/json/', {
                timeout: 3000
            });

            if (response.data && response.data.latitude && response.data.longitude) {
                return {
                    lat: response.data.latitude,
                    lng: response.data.longitude,
                    accuracy: 10000, // IP location biasanya akurasi ~10km
                    strategy: 'ip_based',
                    city: response.data.city,
                    country: response.data.country_name,
                    timestamp: Date.now()
                };
            }
        } catch (error) {
            console.error('❌ IP-based location failed:', error.message);
            return null;
        }
    }

    // Optimized reverse geocoding dengan batch processing
    async getAddressFromLatLng(lat, lng, priority = 'speed') {
        const key = `${lat.toFixed(5)},${lng.toFixed(5)}`; // Kurangi presisi untuk caching lebih efektif
        
        if (this.reverseCache.has(key)) {
            return this.reverseCache.get(key);
        }

        try {
            await this.waitForRateLimit();

            // Timeout lebih pendek untuk kecepatan
            const timeout = priority === 'speed' ? 2000 : 5000;
            
            const response = await axios.get(`${this.nominatimBaseUrl}/reverse`, {
                params: {
                    lat,
                    lon: lng,
                    format: 'json',
                    zoom: priority === 'speed' ? 14 : 18, // Zoom lebih rendah = response lebih cepat
                    addressdetails: priority === 'accuracy' ? 1 : 0,
                    countrycodes: 'id'
                },
                headers: {
                    'User-Agent': 'HidupKu-HealthApp/1.0'
                },
                timeout
            });

            if (response.data && response.data.display_name) {
                const address = this.simplifyAddress(response.data.display_name);
                this.reverseCache.set(key, address);
                return address;
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log('⏱️ Reverse geocoding timeout, using coordinates');
            } else {
                console.error('❌ Reverse geocoding error:', error.message);
            }
        }

        // Fallback: gunakan koordinat sederhana
        const fallbackAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        this.reverseCache.set(key, fallbackAddress);
        return fallbackAddress;
    }

    // Batch reverse geocoding untuk multiple locations
    async batchReverseGeocode(facilities) {
        console.log(`🔄 Batch reverse geocoding for ${facilities.length} facilities...`);
        
        // Hanya geocode 5 terdekat untuk kecepatan
        const topFacilities = facilities.slice(0, 5);
        const promises = topFacilities.map(async (facility, index) => {
            // Delay bertahap untuk menghindari rate limit
            if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, index * 200));
            }
            
            facility.address = await this.getAddressFromLatLng(
                facility.geometry.lat, 
                facility.geometry.lng, 
                'speed'
            );
            return facility;
        });

        // Sisa facilities gunakan koordinat saja
        const remainingFacilities = facilities.slice(5);
        remainingFacilities.forEach(facility => {
            facility.address = `${facility.geometry.lat.toFixed(4)}, ${facility.geometry.lng.toFixed(4)}`;
        });

        await Promise.allSettled(promises);
        return facilities;
    }

    // Simplify address untuk tampilan yang lebih bersih
    simplifyAddress(fullAddress) {
        if (!fullAddress) return 'Alamat tidak diketahui';
        
        // Ambil bagian penting saja (nama jalan, kelurahan, kecamatan)
        const parts = fullAddress.split(',').map(part => part.trim());
        
        // Cari komponen yang relevan
        const relevantParts = parts.filter(part => {
            const lower = part.toLowerCase();
            return !lower.includes('indonesia') && 
                   !lower.includes('java') && 
                   !lower.includes('jawa') &&
                   part.length > 2;
        });

        // Ambil maksimal 3 komponen pertama
        const simplified = relevantParts.slice(0, 3).join(', ');
        return simplified || parts[0] || 'Alamat tidak diketahui';
    }

    // Generate cache key
    generateCacheKey(lat, lng, radius, type) {
        const roundedLat = Math.round(lat * 100) / 100; // Kurangi presisi untuk caching lebih efektif
        const roundedLng = Math.round(lng * 100) / 100;
        return `${roundedLat}_${roundedLng}_${radius}_${type || 'all'}`;
    }

    // Get from cache
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log('📦 Using cached facilities data');
            return cached.data;
        }
        return null;
    }

    // Set cache
    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        console.log('💾 Cached facilities data');
    }

    // Optimized geocoding
    async getCoordinatesFromAddress(address) {
        try {
            console.log('🔍 Geocoding address:', address);
            await this.waitForRateLimit();

            let searchAddress = address;
            if (!address.toLowerCase().includes('indonesia')) {
                searchAddress = `${address}, Indonesia`;
            }

            const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
                params: {
                    q: searchAddress,
                    format: 'json',
                    limit: 1,
                    countrycodes: 'id'
                },
                headers: {
                    'User-Agent': 'HidupKu-HealthApp/1.0'
                },
                timeout: 3000 // Timeout pendek
            });

            if (response.data && response.data.length > 0) {
                const location = response.data[0];
                const coordinates = {
                    lat: parseFloat(location.lat),
                    lng: parseFloat(location.lon),
                    formatted_address: this.simplifyAddress(location.display_name)
                };
                console.log('✅ Geocoding success:', coordinates);
                return coordinates;
            }

            throw new Error('Alamat tidak ditemukan');
        } catch (error) {
            console.error('❌ Geocoding error:', error.message);
            throw new Error('Gagal menemukan koordinat alamat');
        }
    }

    // Optimized facilities search
    async searchHealthcareFacilities(lat, lng, radius = 10000, type = null) {
        try {
            console.log('🏥 Searching facilities:', {
                lat: lat.toFixed(4),
                lng: lng.toFixed(4),
                radius: radius / 1000 + 'km'
            });
            
            const cacheKey = this.generateCacheKey(lat, lng, radius, type);
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }
            
            const facilities = [];
            const searchRadius = Math.min(radius, 3000); // Maksimal 3km untuk kecepatan

            // Simplified query untuk kecepatan
            const query = `
                [out:json][timeout:8];
                (
                    node["amenity"~"^(hospital|pharmacy|clinic|doctors)$"](around:${searchRadius},${lat},${lng});
                );
                out body;
            `;

            console.log('📡 Sending Overpass query...');
            const response = await axios.post(this.overpassBaseUrl, query, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 8000
            });

            if (response.data && response.data.elements) {
                console.log(`📊 Found ${response.data.elements.length} elements`);
                
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
            
            // Cache the result
            this.setCache(cacheKey, sortedFacilities);
            
            console.log(`✅ Found ${sortedFacilities.length} facilities`);
            return sortedFacilities;
        } catch (error) {
            console.error('❌ Error searching facilities:', error.message);
            return [];
        }
    }

    // Fast facility processing (tanpa reverse geocoding dulu)
    processFacilityElementFast(element, userLat, userLng) {
        try {
            if (!element || !element.tags || !element.lat || !element.lon) {
                return null;
            }

            const lat = element.lat;
            const lng = element.lon;
            const name = element.tags.name || this.getDefaultName(element.tags.amenity);
            const distance = this.calculateDistance(userLat, userLng, lat, lng);
            const facilityType = this.determineFacilityType(element.tags);

            return {
                id: element.id,
                name: name,
                type: facilityType,
                address: null, // Akan diisi nanti dengan batch processing
                distance: Number(distance.toFixed(2)),
                geometry: { lat, lng },
                phone: element.tags.phone || null
            };
        } catch (error) {
            console.error('❌ Error processing facility:', error.message);
            return null;
        }
    }

    // Helper methods
    getDefaultName(amenity) {
        switch (amenity) {
            case 'hospital': return 'Rumah Sakit';
            case 'pharmacy': return 'Apotek';
            case 'clinic': return 'Klinik';
            case 'doctors': return 'Praktik Dokter';
            default: return 'Fasilitas Kesehatan';
        }
    }

    determineFacilityType(tags) {
        if (!tags || !tags.amenity) return 'healthcare';
        switch (tags.amenity) {
            case 'hospital': return 'hospital';
            case 'pharmacy': return 'pharmacy';
            case 'clinic': return 'clinic';
            case 'doctors': return 'clinic';
            default: return 'healthcare';
        }
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
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

    filterFacilities(facilities, typeFilter, maxDistance) {
        return facilities.filter(facility => {
            const distanceMatch = facility.distance <= maxDistance;
            const typeMatch = !typeFilter || facility.type === typeFilter;
            return distanceMatch && typeMatch;
        });
    }

    generateNavigationLinks(lat, lng, name) {
        const encodedName = encodeURIComponent(name);
        return {
            google_maps: `https://www.google.com/maps/search/${encodedName}/@${lat},${lng},15z`,
            waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        };
    }

    // Main search method dengan optimasi kecepatan
    async searchFacilities(address = null, userLat = null, userLng = null, typeFilter = null, maxDistance = 10, useCurrentLocation = false) {
        try {
            console.log('🚀 Starting optimized facilities search...');
            
            let coordinates;

            if (useCurrentLocation) {
                coordinates = await this.getCurrentLocation();
                console.log(`📍 Current location: ${coordinates.strategy}, ±${coordinates.accuracy}m`);
            } else if (userLat && userLng) {
                coordinates = { lat: userLat, lng: userLng, formatted_address: 'Koordinat manual' };
            } else if (address) {
                coordinates = await this.getCoordinatesFromAddress(address);
            } else {
                throw new Error('Tidak ada lokasi yang diberikan');
            }

            // Search facilities
            const facilities = await this.searchHealthcareFacilities(
                coordinates.lat,
                coordinates.lng,
                maxDistance * 1000,
                typeFilter
            );

            const filteredFacilities = this.filterFacilities(facilities, typeFilter, maxDistance);
            
            // Batch reverse geocoding hanya untuk facilities terdekat
            await this.batchReverseGeocode(filteredFacilities);

            // Add navigation links
            const facilitiesWithLinks = filteredFacilities.map(facility => ({
                ...facility,
                navigation_links: this.generateNavigationLinks(
                    facility.geometry.lat,
                    facility.geometry.lng,
                    facility.name
                )
            }));

            const result = {
                user_location: {
                    lat: coordinates.lat,
                    lng: coordinates.lng,
                    formatted_address: coordinates.formatted_address || 'Lokasi pengguna',
                    accuracy: coordinates.accuracy
                },
                facilities: facilitiesWithLinks.slice(0, 10), // Limit 10 results
                total_found: filteredFacilities.length,
                performance: {
                    location_strategy: coordinates.strategy,
                    search_radius_km: maxDistance,
                    cache_used: this.getFromCache(this.generateCacheKey(coordinates.lat, coordinates.lng, maxDistance * 1000, typeFilter)) !== null
                }
            };
            
            console.log('🎉 Search completed:', {
                total_found: result.total_found,
                returned: result.facilities.length,
                location_accuracy: coordinates.accuracy ? `±${coordinates.accuracy}m` : 'Unknown'
            });
            
            return result;
        } catch (error) {
            console.error('❌ Search failed:', error.message);
            return {
                user_location: null,
                facilities: [],
                total_found: 0,
                error: error.message
            };
        }
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        this.reverseCache.clear();
        this.locationCache.clear();
        console.log('🗑️ All caches cleared');
    }

    // Get location status
    async getLocationStatus() {
        if (!navigator.geolocation) {
            return { supported: false, message: 'Geolocation tidak didukung' };
        }

        if (navigator.permissions) {
            try {
                const permission = await navigator.permissions.query({name: 'geolocation'});
                return {
                    supported: true,
                    permission: permission.state,
                    message: permission.state === 'granted' ? 
                        'Akses lokasi diizinkan' : 
                        'Akses lokasi perlu diizinkan'
                };
            } catch (error) {
                return { supported: true, permission: 'unknown', message: 'Status tidak dapat ditentukan' };
            }
        }

        return { supported: true, permission: 'unknown', message: 'Geolocation tersedia' };
    }
}

export default FacilitiesServiceCache;