// Load current fees when the page loads
async function loadCurrentFees() {
    try {
        const response = await fetch('/admin/fees');
        const data = await response.json();
        
        // Populate form fields with current values
        document.getElementById('boarding_term1').value = data['boarding.term1'];
        document.getElementById('boarding_term2').value = data['boarding.term2'];
        document.getElementById('boarding_term3').value = data['boarding.term3'];
        document.getElementById('day_term1').value = data['day.term1'];
        document.getElementById('day_term2').value = data['day.term2'];
        document.getElementById('day_term3').value = data['day.term3'];
    } catch (error) {
        console.error('Error loading fees:', error);
        alert('Error loading current fees data');
    }
}

// Handle form submission to update fees
document.getElementById('feesForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        'boarding.term1': parseInt(document.getElementById('boarding_term1').value),
        'boarding.term2': parseInt(document.getElementById('boarding_term2').value),
        'boarding.term3': parseInt(document.getElementById('boarding_term3').value),
        'day.term1': parseInt(document.getElementById('day_term1').value),
        'day.term2': parseInt(document.getElementById('day_term2').value),
        'day.term3': parseInt(document.getElementById('day_term3').value)
    };

    try {
        const response = await fetch('/admin/update-fees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fees: formData })
        });

        const result = await response.json();
        if (result.success) {
            alert('Fees updated successfully');
        } else {
            alert('Failed to update fees: ' + result.message);
        }
    } catch (error) {
        console.error('Error updating fees:', error);
        alert('Error updating fees');
    }
});

// Load fees when page loads
document.addEventListener('DOMContentLoaded', loadCurrentFees);