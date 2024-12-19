// API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'https://mocktrade.onrender.com';

// Stock data and update interval
let stocksData = [];
const UPDATE_INTERVAL = 60000; // 1 minute

// Auth token and user info
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

// Update UI based on auth state
function updateAuthUI() {
    if (authToken && currentUser) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('signupBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
    } else {
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('signupBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
    }
}

// Initialize auth state
updateAuthUI();

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    showLoading();
    initializeAuth();
    if (authToken) {
        fetchStockData();
        initializeMarketChart();
        initializeSensexChart();
        initializeSearchBar();
        setupPriceAlerts();
    } else {
        document.getElementById('stockGrid').innerHTML = 
            '<div class="message">Please log in to view stock data</div>';
    }
    // Auto-refresh data every minute
    setInterval(fetchStockData, UPDATE_INTERVAL);
});

// Show loading state
function showLoading() {
    const stockGrid = document.getElementById('stockGrid');
    stockGrid.innerHTML = '<div class="loading">Loading stock data...</div>';
}

// Initialize authentication
function initializeAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const closeBtns = document.getElementsByClassName('close');

    // Event listeners for buttons
    loginBtn.onclick = () => loginModal.style.display = 'block';
    signupBtn.onclick = () => signupModal.style.display = 'block';
    logoutBtn.onclick = handleLogout;

    // Close modals
    Array.from(closeBtns).forEach(btn => {
        btn.onclick = function() {
            loginModal.style.display = 'none';
            signupModal.style.display = 'none';
        }
    });

    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target == loginModal) loginModal.style.display = 'none';
        if (event.target == signupModal) signupModal.style.display = 'none';
    }

    // Handle form submissions
    document.getElementById('loginForm').onsubmit = handleLogin;
    document.getElementById('signupForm').onsubmit = handleSignup;
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        authToken = data.token;
        currentUser = { name: data.name, email: data.email };
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Update UI
        document.getElementById('loginModal').style.display = 'none';
        updateAuthUI();
        
        // Clear form
        document.getElementById('loginForm').reset();
        
        // Fetch data
        await fetchStockData();
        await initializeMarketChart();
        await initializeSensexChart();
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message || 'Login failed. Please try again.');
    }
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const response = await fetch(`${API_URL}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Signup failed');
        }

        authToken = data.token;
        currentUser = { name: data.name, email: data.email };
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Update UI
        document.getElementById('signupModal').style.display = 'none';
        updateAuthUI();
        
        // Clear form
        document.getElementById('signupForm').reset();
        
        // Fetch data
        await fetchStockData();
        await initializeMarketChart();
        await initializeSensexChart();
    } catch (error) {
        console.error('Signup error:', error);
        alert(error.message || 'Signup failed. Please try again.');
    }
}

// Handle logout
function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateAuthUI();
    document.getElementById('stockGrid').innerHTML = 
        '<div class="message">Please log in to view stock data</div>';
    document.getElementById('marketChart').innerHTML = '';
    document.getElementById('sensexChart').innerHTML = '';
}

// Fetch real-time stock data from our backend
async function fetchStockData() {
    try {
        const response = await fetch(`${API_URL}/api/stocks`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            stocksData = data;
            renderStockCards(stocksData);
            updateStockData(data);
        } else {
            throw new Error('Invalid data format received');
        }
    } catch (error) {
        console.error('Error fetching stock data:', error);
        document.getElementById('stockGrid').innerHTML = 
            '<div class="error">Error loading stock data. Please try again later.</div>';
    }
}

// Render stock cards
function renderStockCards(stocks) {
    const stockGrid = document.getElementById('stockGrid');
    stockGrid.innerHTML = '';
    
    stocks.forEach(stock => {
        const card = document.createElement('div');
        card.className = 'stock-card';
        card.onclick = () => showStockDetails(stock);
        
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        const changeSign = stock.change >= 0 ? '+' : '';
        
        card.innerHTML = `
            <div class="stock-header">
                <h3>${stock.symbol}</h3>
                <span class="success-rate">Success: ${calculateSuccessRate(stock)}%</span>
            </div>
            <p class="company-name">${stock.name}</p>
            <div class="stock-price">₹${stock.price.toFixed(2)}</div>
            <div class="stock-change ${changeClass}">
                ${changeSign}${stock.change.toFixed(2)} (${changeSign}${stock.changePercent.toFixed(2)}%)
            </div>
            <div class="stock-volume">Vol: ${(stock.volume/1000000).toFixed(2)}M</div>
            <div class="stock-range">
                <span>L: ₹${stock.dayLow.toFixed(2)}</span>
                <span>H: ₹${stock.dayHigh.toFixed(2)}</span>
            </div>
        `;
        
        stockGrid.appendChild(card);
    });
}

// Calculate success rate based on technical analysis
function calculateSuccessRate(stock) {
    // Basic success rate calculation
    const priceRange = stock.dayHigh - stock.dayLow;
    const currentPricePosition = (stock.price - stock.dayLow) / priceRange;
    const changeImpact = stock.changePercent > 0 ? 1 : -1;
    
    // Base rate between 60-90 based on price position in day's range
    const baseRate = 60 + (currentPricePosition * 30);
    
    // Adjust based on price change
    const changeAdjustment = Math.min(Math.abs(stock.changePercent) * 2, 10) * changeImpact;
    
    // Final rate
    return Math.min(Math.max(Math.round(baseRate + changeAdjustment), 0), 100);
}

// Show detailed stock information
async function showStockDetails(stock) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    try {
        const [historical, technical] = await Promise.all([
            fetch(`${API_URL}/api/historical/${stock.symbol}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            }),
            fetch(`${API_URL}/api/technical/${stock.symbol}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            })
        ]);
        
        const historicalData = await historical.json();
        const technicalData = await technical.json();
        
        modal.innerHTML = `
            <div class="modal-content">
                <h2>${stock.name} (${stock.symbol})</h2>
                <div id="historicalChart"></div>
                <div class="technical-indicators">
                    <h3>Technical Indicators</h3>
                    <div>RSI: ${technicalData.RSI?.['RSI']?.[0]?.toFixed(2) || 'N/A'}</div>
                    <div>MACD: ${technicalData.MACD?.['MACD']?.[0]?.toFixed(2) || 'N/A'}</div>
                    <div>EMA: ${technicalData.EMA?.['EMA']?.[0]?.toFixed(2) || 'N/A'}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        renderHistoricalChart('historicalChart', historicalData);
    } catch (error) {
        console.error('Error showing stock details:', error);
    }
}

// Initialize market chart
async function initializeMarketChart() {
    const ctx = document.getElementById('marketChart').getContext('2d');
    try {
        const response = await fetch(`${API_URL}/api/nifty50`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch NIFTY data');
        const data = await response.json();
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.timestamps.map(ts => new Date(ts).toLocaleTimeString()),
                datasets: [{
                    label: 'NIFTY 50',
                    data: data.prices,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: 'NIFTY 50 Performance'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: value => '₹' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error initializing NIFTY chart:', error);
        document.getElementById('marketChart').parentElement.innerHTML = 
            '<div class="error">Error loading NIFTY data</div>';
    }
}

// Initialize SENSEX chart
async function initializeSensexChart() {
    const ctx = document.getElementById('sensexChart').getContext('2d');
    try {
        const response = await fetch(`${API_URL}/api/sensex`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch SENSEX data');
        const data = await response.json();
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.timestamps.map(ts => new Date(ts).toLocaleTimeString()),
                datasets: [{
                    label: 'BSE SENSEX',
                    data: data.prices,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: 'SENSEX Performance'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: value => '₹' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error initializing SENSEX chart:', error);
        document.getElementById('sensexChart').parentElement.innerHTML = 
            '<div class="error">Error loading SENSEX data</div>';
    }
}

// Setup price alerts
function setupPriceAlerts() {
    const alertsDiv = document.createElement('div');
    alertsDiv.className = 'price-alerts';
    alertsDiv.innerHTML = `
        <h3>Price Alerts</h3>
        <div class="alert-form">
            <input type="text" id="alertSymbol" placeholder="Stock Symbol">
            <input type="number" id="alertPrice" placeholder="Target Price">
            <select id="alertType">
                <option value="above">Above</option>
                <option value="below">Below</option>
            </select>
            <button onclick="addAlert()">Add Alert</button>
        </div>
        <div id="activeAlerts"></div>
    `;
    document.body.appendChild(alertsDiv);
}

// Price Alerts Management
let priceAlerts = JSON.parse(localStorage.getItem('priceAlerts') || '[]');

function addAlert() {
    const symbol = document.getElementById('alertSymbol').value.toUpperCase();
    const price = parseFloat(document.getElementById('alertPrice').value);
    const type = document.getElementById('alertType').value;

    if (!symbol || !price) {
        alert('Please fill in all fields');
        return;
    }

    // Validate symbol
    const validSymbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 
                         'ICICIBANK', 'SBIN', 'BHARTIARTL', 'WIPRO', 'LT'];
    if (!validSymbols.includes(symbol)) {
        alert('Please enter a valid stock symbol');
        return;
    }

    // Add new alert
    const alert = {
        id: Date.now(),
        symbol,
        price,
        type,
        triggered: false
    };

    priceAlerts.push(alert);
    localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
    renderAlerts();
    checkAlerts(stocksData);

    // Clear form
    document.getElementById('alertSymbol').value = '';
    document.getElementById('alertPrice').value = '';
}

function deleteAlert(id) {
    priceAlerts = priceAlerts.filter(alert => alert.id !== id);
    localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
    renderAlerts();
}

function renderAlerts() {
    const alertsContainer = document.getElementById('activeAlerts');
    alertsContainer.innerHTML = priceAlerts.map(alert => `
        <div class="alert-item ${alert.triggered ? 'triggered' : ''}">
            <div class="alert-info">
                <span class="alert-symbol">${alert.symbol}</span>
                <span class="alert-price">₹${alert.price}</span>
                <span class="alert-type">${alert.type === 'above' ? '↑' : '↓'} ${alert.type}</span>
            </div>
            <button class="delete-alert" onclick="deleteAlert(${alert.id})">Delete</button>
        </div>
    `).join('');
}

function checkAlerts(stocks) {
    if (!stocks || !Array.isArray(stocks)) return;

    let alertTriggered = false;
    priceAlerts.forEach(alert => {
        const stock = stocks.find(s => s.symbol === alert.symbol);
        if (!stock) return;

        const currentPrice = stock.price;
        const wasTriggered = alert.triggered;

        if (alert.type === 'above' && currentPrice > alert.price) {
            alert.triggered = true;
        } else if (alert.type === 'below' && currentPrice < alert.price) {
            alert.triggered = true;
        }

        if (alert.triggered && !wasTriggered) {
            alertTriggered = true;
            showNotification(
                `Price Alert: ${alert.symbol}`,
                `Price ${alert.type === 'above' ? 'exceeded' : 'fell below'} ₹${alert.price}`
            );
        }
    });

    if (alertTriggered) {
        localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
        renderAlerts();
    }
}

function showNotification(title, message) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        new Notification(title, { body: message });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, { body: message });
            }
        });
    }
}

// Initialize alerts on page load
document.addEventListener('DOMContentLoaded', () => {
    renderAlerts();
    if ("Notification" in window) {
        Notification.requestPermission();
    }
});

// Check alerts when new stock data arrives
function updateStockData(data) {
    stocksData = data;
    renderStockCards(data);
    checkAlerts(data);
}

// Initialize search functionality
function initializeSearchBar() {
    let searchTimeout;
    const searchInput = document.getElementById('searchInput');
    
    if (!searchInput) {
        console.error('Search input not found');
        return;
    }
    
    searchInput.addEventListener('input', e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase();
            const filteredStocks = stocksData.filter(stock => 
                stock.symbol.toLowerCase().includes(query) ||
                stock.name.toLowerCase().includes(query)
            );
            renderStockCards(filteredStocks);
        }, 300);
    });
}

// Render historical chart
function renderHistoricalChart(id, data) {
    const ctx = document.getElementById(id).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.timestamps.map(ts => new Date(ts).toLocaleTimeString()),
            datasets: [{
                label: 'Historical Prices',
                data: data.prices,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: {
                    display: true,
                    text: 'Historical Prices'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: value => '₹' + value.toLocaleString()
                    }
                }
            }
        }
    });
}
