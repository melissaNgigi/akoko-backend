// Function to load performance data from CMS
async function loadPerformanceData() {
    try {
        const response = await fetch('/api/performance');
        const data = await response.json();
        
        // Sort data by year
        data.sort((a, b) => a.year - b.year);
        
        // Update table
        updatePerformanceTable(data);
        
        // Update line graph
        createPerformanceGraph(data);
        
    } catch (error) {
        console.error('Error loading performance data:', error);
    }
}

// Function to update the performance table
function updatePerformanceTable(data) {
    const tableBody = document.getElementById('performanceTableBody');
    tableBody.innerHTML = '';
    
    data.forEach(item => {
        const row = `
            <tr>
                <td>${item.year}</td>
                <td>${item.meanScore.toFixed(2)}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Function to create the line graph
function createPerformanceGraph(data) {
    const ctx = document.getElementById('performanceGraph').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.year),
            datasets: [{
                label: 'Mean Score',
                data: data.map(item => item.meanScore),
                borderColor: '#666666',
                backgroundColor: 'rgba(102, 102, 102, 0.1)',
                pointBackgroundColor: '#666666',
                pointHoverBackgroundColor: '#898989',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#e0e0e0'
                    },
                    ticks: {
                        color: '#666666'
                    }
                },
                x: {
                    grid: {
                        color: '#e0e0e0'
                    },
                    ticks: {
                        color: '#666666'
                    }
                }
            }
        }
    });
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadPerformanceData); 