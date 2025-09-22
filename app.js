// EV Analytics Dashboard - Complete JavaScript with CSV Loading
// MapUp Assessment - Updated to use real CSV data

class EVDashboard {
    constructor() {
        this.originalData = null;
        this.currentData = null;
        this.charts = {};
        this.isLoading = true;
        this.filters = {
            manufacturer: 'all',
            evType: 'all',
            county: 'all',
            priceRange: 'all'
        };
        this.init();
    }

    async init() {
        try {
            // Show loading state
            this.showLoading();
            
            // Load real CSV data from MapUp repository
            const csvData = await this.loadRealCSVData();
            
            if (csvData && csvData.length > 0) {
                console.log(`✅ Loaded ${csvData.length} EV records from CSV`);
                this.processRealData(csvData);
            } else {
                console.warn('⚠️ Failed to load CSV data, using fallback data');
                this.useFallbackData();
            }
            
            // Initialize dashboard components
            this.updateKPIs();
            this.createCharts();
            this.setupFilters();
            this.setupExportButton();
            this.hideLoading();
            
            console.log('🚀 Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing dashboard:', error);
            this.useFallbackData();
            this.updateKPIs();
            this.createCharts();
            this.setupFilters();
            this.setupExportButton();
            this.hideLoading();
        }
    }

    async loadRealCSVData() {
        try {
            // Try multiple possible locations for the CSV file
            const possibleUrls = [
                './data-to-visualize/Electric_Vehicle_Population_Data.csv',
                './Electric_Vehicle_Population_Data.csv',
                'https://raw.githubusercontent.com/vedant-patil-mapup/analytics-dashboard-assessment/main/data-to-visualize/Electric_Vehicle_Population_Data.csv'
            ];

            let csvData = null;
            
            for (const url of possibleUrls) {
                try {
                    console.log(`🔍 Trying to load CSV from: ${url}`);
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'text/csv,text/plain,*/*'
                        }
                    });
                    
                    if (response.ok) {
                        const csvText = await response.text();
                        if (csvText.trim().length > 0) {
                            csvData = this.parseCSV(csvText);
                            if (csvData.length > 0) {
                                console.log(`✅ Successfully loaded CSV from: ${url}`);
                                break;
                            }
                        }
                    }
                } catch (err) {
                    console.log(`❌ Failed to load from ${url}:`, err.message);
                    continue;
                }
            }
            
            return csvData;
            
        } catch (error) {
            console.error('❌ Error loading CSV data:', error);
            return null;
        }
    }

    parseCSV(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            if (lines.length < 2) {
                console.error('❌ CSV file appears to be empty or invalid');
                return [];
            }

            // Get headers and clean them
            const headers = this.parseCSVLine(lines[0])
                .map(header => header.trim().replace(/['"]/g, ''));

            console.log('📋 CSV Headers found:', headers.slice(0, 5), '...');

            const data = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = this.parseCSVLine(line);
                
                if (values.length >= headers.length - 2) { // Allow some flexibility
                    const record = {};
                    headers.forEach((header, index) => {
                        record[header] = values[index] ? values[index].trim().replace(/['"]/g, '') : '';
                    });
                    data.push(record);
                }
            }

            console.log(`📊 Parsed ${data.length} records from CSV`);
            console.log('🔍 Sample record:', data[0]);
            return data;

        } catch (error) {
            console.error('❌ Error parsing CSV:', error);
            return [];
        }
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    processRealData(csvData) {
        console.log('⚙️ Processing real CSV data...');
        
        this.originalData = {
            evData: csvData,
            yearlyData: this.generateYearlyTrends(csvData),
            manufacturerData: this.generateManufacturerStats(csvData),
            countyData: this.generateCountyStats(csvData),
            evTypeData: this.generateEVTypeStats(csvData),
            topModels: this.generateTopModels(csvData),
            kpis: this.generateKPIs(csvData)
        };
        
        this.currentData = JSON.parse(JSON.stringify(this.originalData));
        console.log('✅ Data processing complete');
        console.log('📈 KPIs:', this.originalData.kpis);
    }

    generateYearlyTrends(data) {
        const yearCounts = {};
        
        data.forEach(record => {
            const year = parseInt(record['Model Year']) || 0;
            if (year >= 2010 && year <= 2024) {
                yearCounts[year] = (yearCounts[year] || 0) + 1;
            }
        });

        const years = Object.keys(yearCounts).map(Number).sort();
        const counts = years.map(year => yearCounts[year] || 0);

        return { years, counts };
    }

    generateManufacturerStats(data) {
        const makeCounts = {};
        const makePrices = {};

        data.forEach(record => {
            const make = (record['Make'] || '').toUpperCase().trim();
            if (!make || make === 'NULL' || make === '') return;

            const price = parseFloat(record['Base MSRP']) || 0;
            
            makeCounts[make] = (makeCounts[make] || 0) + 1;
            
            if (price > 0) {
                if (!makePrices[make]) makePrices[make] = [];
                makePrices[make].push(price);
            }
        });

        const manufacturers = Object.keys(makeCounts)
            .sort((a, b) => makeCounts[b] - makeCounts[a])
            .slice(0, 10);

        const counts = manufacturers.map(make => makeCounts[make]);
        const avgPrices = manufacturers.map(make => {
            const prices = makePrices[make] || [];
            return prices.length > 0 
                ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
                : 0;
        });

        return { manufacturers, counts, avgPrices };
    }

    generateCountyStats(data) {
        const countyCounts = {};

        data.forEach(record => {
            const county = (record['County'] || '').trim();
            if (county && county !== 'NULL' && county !== '') {
                countyCounts[county] = (countyCounts[county] || 0) + 1;
            }
        });

        const counties = Object.keys(countyCounts)
            .sort((a, b) => countyCounts[b] - countyCounts[a])
            .slice(0, 10);

        const counts = counties.map(county => countyCounts[county]);

        return { counties, counts };
    }

    generateEVTypeStats(data) {
        const typeCounts = {};

        data.forEach(record => {
            let type = record['Electric Vehicle Type'] || '';
            
            // Normalize EV types
            if (type.includes('Battery Electric') || type.includes('BEV')) {
                type = 'Battery Electric Vehicle (BEV)';
            } else if (type.includes('Plug-in Hybrid') || type.includes('PHEV')) {
                type = 'Plug-in Hybrid Electric Vehicle (PHEV)';
            }

            if (type && type !== 'NULL' && type !== '') {
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            }
        });

        return {
            types: Object.keys(typeCounts),
            counts: Object.values(typeCounts)
        };
    }

    generateTopModels(data) {
        const modelCounts = {};

        data.forEach(record => {
            const make = (record['Make'] || '').trim();
            const model = (record['Model'] || '').trim();
            
            if (make && model && make !== 'NULL' && model !== 'NULL') {
                const key = `${make}|${model}`;
                modelCounts[key] = (modelCounts[key] || 0) + 1;
            }
        });

        return Object.entries(modelCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([key, count]) => {
                const [make, model] = key.split('|');
                return { make, model, count };
            });
    }

    generateKPIs(data) {
        const totalEVs = data.length;
        
        // Calculate average range
        const validRanges = data
            .map(record => parseFloat(record['Electric Range']) || 0)
            .filter(range => range > 0);
        const avgRange = validRanges.length > 0 
            ? Math.round(validRanges.reduce((a, b) => a + b, 0) / validRanges.length * 10) / 10
            : 0;

        // Calculate average price
        const validPrices = data
            .map(record => parseFloat(record['Base MSRP']) || 0)
            .filter(price => price > 0);
        const avgPrice = validPrices.length > 0
            ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
            : 0;

        // Calculate BEV percentage
        const bevCount = data.filter(record => {
            const type = record['Electric Vehicle Type'] || '';
            return type.includes('Battery Electric') || type.includes('BEV');
        }).length;
        const bevPercentage = totalEVs > 0 ? Math.round(bevCount / totalEVs * 100) : 0;

        return { totalEVs, avgRange, avgPrice, bevPercentage };
    }

    useFallbackData() {
        console.log('🔄 Using fallback sample data');
        this.originalData = {
            evData: [
                {"Make": "TESLA", "Model": "MODEL Y", "ModelYear": 2024, "County": "King", "City": "Seattle", "EVType": "BEV", "Range": 326, "Price": 52990},
                {"Make": "TESLA", "Model": "MODEL 3", "ModelYear": 2023, "County": "King", "City": "Bellevue", "EVType": "BEV", "Range": 358, "Price": 40740},
                {"Make": "NISSAN", "Model": "LEAF", "ModelYear": 2022, "County": "Snohomish", "City": "Everett", "EVType": "BEV", "Range": 226, "Price": 31620},
                {"Make": "CHEVROLET", "Model": "BOLT EV", "ModelYear": 2023, "County": "Pierce", "City": "Tacoma", "EVType": "BEV", "Range": 259, "Price": 31000}
            ],
            yearlyData: {
                years: [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
                counts: [7, 12, 29, 17, 36, 43, 52, 59, 82, 99, 98, 159, 178, 129]
            },
            manufacturerData: {
                manufacturers: ["TESLA", "NISSAN", "CHEVROLET", "BMW", "FORD", "AUDI", "KIA", "HYUNDAI", "MERCEDES-BENZ", "VOLKSWAGEN"],
                counts: [377, 164, 96, 80, 53, 50, 50, 49, 42, 39],
                avgPrices: [80828, 44739, 45830, 71145, 44082, 74754, 43076, 45180, 76440, 48256]
            },
            countyData: {
                counties: ["King", "Snohomish", "Pierce", "Island", "Clark", "Thurston", "Spokane", "Skagit", "Whatcom", "Kitsap"],
                counts: [464, 114, 104, 104, 52, 46, 43, 31, 21, 21]
            },
            evTypeData: {
                types: ["Battery Electric Vehicle (BEV)", "Plug-in Hybrid Electric Vehicle (PHEV)"],
                counts: [820, 180]
            },
            topModels: [
                {"make": "NISSAN", "model": "LEAF", "count": 164},
                {"make": "TESLA", "model": "MODEL X", "count": 99},
                {"make": "TESLA", "model": "MODEL S", "count": 95},
                {"make": "TESLA", "model": "MODEL Y", "count": 92},
                {"make": "TESLA", "model": "MODEL 3", "count": 91}
            ],
            kpis: {totalEVs: 1000, avgRange: 240.4, avgPrice: 63435, bevPercentage: 82}
        };
        this.currentData = JSON.parse(JSON.stringify(this.originalData));
    }

    showLoading() {
        const loadingHTML = `
            <div id="loadingIndicator" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">
                <div style="text-align: center; padding: 2rem;">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 3px solid rgba(59, 130, 246, 0.3);
                        border-top: 3px solid #3b82f6;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 1.5rem;
                    "></div>
                    <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 0.5rem;">
                        🔄 Loading EV Data
                    </div>
                    <div style="font-size: 0.9rem; opacity: 0.7; color: #94a3b8;">
                        Parsing CSV data from MapUp repository...
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    }

    hideLoading() {
        const loading = document.getElementById('loadingIndicator');
        if (loading) {
            setTimeout(() => loading.remove(), 500);
        }
    }

    updateKPIs() {
        const kpis = this.currentData.kpis;
        
        // Update KPI values with animation
        this.animateValue('totalEVs', kpis.totalEVs, 0);
        this.animateValue('avgRange', kpis.avgRange, 1);
        this.animateValue('avgPrice', kpis.avgPrice, 0, '$');
        this.animateValue('bevPercentage', kpis.bevPercentage, 0, '', '%');
    }

    animateValue(elementId, targetValue, decimals = 0, prefix = '', suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = 0;
        const duration = 1500;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentValue = startValue + (targetValue - startValue) * easeOut;
            const displayValue = decimals > 0 
                ? currentValue.toFixed(decimals)
                : Math.floor(currentValue).toLocaleString();
            
            element.textContent = prefix + displayValue + suffix;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    createCharts() {
        this.createAdoptionChart();
        this.createManufacturerChart();
        this.createCountyChart();
        this.createEVTypeChart();
        this.createPriceChart();
        this.updateDataTables();
    }

    createAdoptionChart() {
        const ctx = document.getElementById('adoptionChart');
        if (!ctx) return;

        if (this.charts.adoption) {
            this.charts.adoption.destroy();
        }

        this.charts.adoption = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.currentData.yearlyData.years,
                datasets: [{
                    label: 'EV Registrations',
                    data: this.currentData.yearlyData.counts,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'EV Adoption Trends Over Time',
                        font: { size: 16, weight: 'bold' },
                        color: '#1e293b'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Model Year',
                            font: { weight: 'bold' }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of EVs',
                            font: { weight: 'bold' }
                        }
                    }
                }
            }
        });
    }

    createManufacturerChart() {
        const ctx = document.getElementById('manufacturerChart');
        if (!ctx) return;

        if (this.charts.manufacturer) {
            this.charts.manufacturer.destroy();
        }

        this.charts.manufacturer = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.currentData.manufacturerData.manufacturers,
                datasets: [{
                    label: 'Number of EVs',
                    data: this.currentData.manufacturerData.counts,
                    backgroundColor: [
                        '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
                        '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
                        '#ec4899', '#6366f1'
                    ],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Market Share by Manufacturer',
                        font: { size: 16, weight: 'bold' },
                        color: '#1e293b'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Manufacturer',
                            font: { weight: 'bold' }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of EVs',
                            font: { weight: 'bold' }
                        }
                    }
                }
            }
        });
    }

    createCountyChart() {
        const ctx = document.getElementById('countyChart');
        if (!ctx) return;

        if (this.charts.county) {
            this.charts.county.destroy();
        }

        this.charts.county = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: this.currentData.countyData.counties,
                datasets: [{
                    data: this.currentData.countyData.counts,
                    backgroundColor: [
                        '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
                        '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
                        '#ec4899', '#6366f1'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { usePointStyle: true }
                    },
                    title: {
                        display: true,
                        text: 'Geographic Distribution by County',
                        font: { size: 16, weight: 'bold' },
                        color: '#1e293b'
                    }
                }
            }
        });
    }

    createEVTypeChart() {
        const ctx = document.getElementById('evTypeChart');
        if (!ctx) return;

        if (this.charts.evType) {
            this.charts.evType.destroy();
        }

        this.charts.evType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.currentData.evTypeData.types,
                datasets: [{
                    data: this.currentData.evTypeData.counts,
                    backgroundColor: ['#10b981', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true }
                    },
                    title: {
                        display: true,
                        text: 'EV Type Distribution',
                        font: { size: 16, weight: 'bold' },
                        color: '#1e293b'
                    }
                }
            }
        });
    }

    createPriceChart() {
        const ctx = document.getElementById('priceChart');
        if (!ctx) return;

        if (this.charts.price) {
            this.charts.price.destroy();
        }

        this.charts.price = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.currentData.manufacturerData.manufacturers,
                datasets: [{
                    label: 'Average Price ($)',
                    data: this.currentData.manufacturerData.avgPrices,
                    backgroundColor: '#f59e0b',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Average Price by Manufacturer',
                        font: { size: 16, weight: 'bold' },
                        color: '#1e293b'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Manufacturer',
                            font: { weight: 'bold' }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Average Price ($)',
                            font: { weight: 'bold' }
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    updateDataTables() {
        // Update top models table
        const topModelsTable = document.getElementById('topModelsTable');
        if (topModelsTable) {
            const tbody = topModelsTable.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = this.currentData.topModels.map((model, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${model.make}</td>
                        <td>${model.model}</td>
                        <td>${model.count}</td>
                    </tr>
                `).join('');
            }
        }

        // Update manufacturer prices table
        const priceTable = document.getElementById('priceTable');
        if (priceTable) {
            const tbody = priceTable.querySelector('tbody');
            if (tbody) {
                const manufacturers = this.currentData.manufacturerData.manufacturers;
                const avgPrices = this.currentData.manufacturerData.avgPrices;
                
                tbody.innerHTML = manufacturers.map((make, index) => `
                    <tr>
                        <td>${make}</td>
                        <td>$${avgPrices[index].toLocaleString()}</td>
                    </tr>
                `).join('');
            }
        }
    }

    setupFilters() {
        // Manufacturer filter
        const manufacturerFilter = document.getElementById('manufacturerFilter');
        if (manufacturerFilter) {
            const options = ['all', ...this.originalData.manufacturerData.manufacturers];
            manufacturerFilter.innerHTML = options.map(option => 
                `<option value="${option}">${option === 'all' ? 'All Manufacturers' : option}</option>`
            ).join('');
            
            manufacturerFilter.addEventListener('change', (e) => {
                this.filters.manufacturer = e.target.value;
                this.applyFilters();
            });
        }

        // EV Type filter
        const evTypeFilter = document.getElementById('evTypeFilter');
        if (evTypeFilter) {
            const options = ['all', ...this.originalData.evTypeData.types];
            evTypeFilter.innerHTML = options.map(option => 
                `<option value="${option}">${option === 'all' ? 'All Types' : option}</option>`
            ).join('');
            
            evTypeFilter.addEventListener('change', (e) => {
                this.filters.evType = e.target.value;
                this.applyFilters();
            });
        }

        // County filter
        const countyFilter = document.getElementById('countyFilter');
        if (countyFilter) {
            const options = ['all', ...this.originalData.countyData.counties];
            countyFilter.innerHTML = options.map(option => 
                `<option value="${option}">${option === 'all' ? 'All Counties' : option}</option>`
            ).join('');
            
            countyFilter.addEventListener('change', (e) => {
                this.filters.county = e.target.value;
                this.applyFilters();
            });
        }
    }

    applyFilters() {
        let filteredData = [...this.originalData.evData];

        // Apply manufacturer filter
        if (this.filters.manufacturer !== 'all') {
            filteredData = filteredData.filter(record => 
                (record['Make'] || record.Make || '').toUpperCase() === this.filters.manufacturer
            );
        }

        // Apply EV type filter
        if (this.filters.evType !== 'all') {
            filteredData = filteredData.filter(record => {
                const type = record['Electric Vehicle Type'] || record.EVType || '';
                return type.includes(this.filters.evType);
            });
        }

        // Apply county filter
        if (this.filters.county !== 'all') {
            filteredData = filteredData.filter(record => 
                (record['County'] || record.County || '') === this.filters.county
            );
        }

        // Regenerate data with filtered results
        this.currentData = {
            evData: filteredData,
            yearlyData: this.generateYearlyTrends(filteredData),
            manufacturerData: this.generateManufacturerStats(filteredData),
            countyData: this.generateCountyStats(filteredData),
            evTypeData: this.generateEVTypeStats(filteredData),
            topModels: this.generateTopModels(filteredData),
            kpis: this.generateKPIs(filteredData)
        };

        // Update dashboard
        this.updateKPIs();
        this.createCharts();
    }

    setupExportButton() {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
    }

    exportData() {
        try {
            const data = {
                summary: this.currentData.kpis,
                yearlyTrends: this.currentData.yearlyData,
                manufacturers: this.currentData.manufacturerData,
                counties: this.currentData.countyData,
                evTypes: this.currentData.evTypeData,
                topModels: this.currentData.topModels,
                exportDate: new Date().toISOString(),
                filters: this.filters
            };

            const dataStr = JSON.stringify(data, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'ev-analytics-data.json';
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            console.log('✅ Data exported successfully');
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            alert('Error exporting data. Please check the console for details.');
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing EV Analytics Dashboard...');
    new EVDashboard();
});

// Add some global utility functions
window.EVDashboard = EVDashboard;