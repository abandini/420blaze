// Countdown Timer
function updateCountdown() {
    const now = new Date();
    const targetDate = new Date('April 20, 2025 00:00:00');
    
    // Calculate time difference
    const diff = targetDate - now;
    
    // If 4/20 has passed, show zeros
    if (diff <= 0) {
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        return;
    }
    
    // Calculate hours, minutes, seconds
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    // Update the countdown display
    document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
}

// Event filter functionality
function setupEventFilter() {
    const stateFilter = document.getElementById('state-filter');
    if (!stateFilter) return;
    
    stateFilter.addEventListener('change', function() {
        const selectedState = this.value;
        const eventCards = document.querySelectorAll('.event-card');
        
        eventCards.forEach(card => {
            if (selectedState === 'all' || card.dataset.state === selectedState) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize countdown if elements exist
    if (document.getElementById('countdown-timer')) {
        updateCountdown();
        // Update countdown every second
        setInterval(updateCountdown, 1000);
    }
    
    // Initialize event filter
    setupEventFilter();
});
