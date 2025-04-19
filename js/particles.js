document.addEventListener('DOMContentLoaded', function() {
    // Create canvas for leaf particles if the element exists
    if (document.querySelector('.hero')) {
        createLeafParticles();
    }
});

function createLeafParticles() {
    const hero = document.querySelector('.hero');
    const canvas = document.createElement('canvas');
    canvas.className = 'leaf-particles';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '2';
    hero.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    function resizeCanvas() {
        canvas.width = hero.offsetWidth;
        canvas.height = hero.offsetHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create leaf particles
    const particles = [];
    const leafImages = [
        createLeafImage('#00843D'),  // Cannabis green
        createLeafImage('#63D471'),  // Light green
        createLeafImage('#F7A400')   // 420 gold
    ];
    
    function createLeafImage(color) {
        const leafCanvas = document.createElement('canvas');
        leafCanvas.width = 30;
        leafCanvas.height = 30;
        const leafCtx = leafCanvas.getContext('2d');
        
        // Draw a cannabis leaf shape
        leafCtx.fillStyle = color;
        leafCtx.beginPath();
        
        // Draw leaf
        leafCtx.moveTo(15, 0);
        leafCtx.bezierCurveTo(10, 10, 5, 15, 0, 15);
        leafCtx.bezierCurveTo(5, 20, 10, 25, 15, 30);
        leafCtx.bezierCurveTo(20, 25, 25, 20, 30, 15);
        leafCtx.bezierCurveTo(25, 15, 20, 10, 15, 0);
        
        leafCtx.fill();
        
        return leafCanvas;
    }
    
    function createParticle() {
        const size = Math.random() * 20 + 10;
        const leafImg = leafImages[Math.floor(Math.random() * leafImages.length)];
        
        return {
            x: Math.random() * canvas.width,
            y: -size,
            size: size,
            speedY: Math.random() * 1 + 0.5,
            speedX: Math.random() * 2 - 1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 2 - 1,
            image: leafImg,
            opacity: Math.random() * 0.5 + 0.2
        };
    }
    
    // Add initial particles
    for (let i = 0; i < 20; i++) {
        const p = createParticle();
        p.y = Math.random() * canvas.height;
        particles.push(p);
    }
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Add new particles occasionally
        if (Math.random() < 0.05 && particles.length < 50) {
            particles.push(createParticle());
        }
        
        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;
            
            // Remove particles that are off screen
            if (p.y > canvas.height + p.size) {
                particles.splice(i, 1);
                i--;
                continue;
            }
            
            // Draw particle
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.globalAlpha = p.opacity;
            ctx.drawImage(p.image, -p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Add 420 clock functionality
function setup420Clock() {
    const clockElement = document.getElementById('clock-420');
    if (!clockElement) return;
    
    function updateClock() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // Check if it's 4:20
        if (hours === 4 && minutes === 20 || hours === 16 && minutes === 20) {
            clockElement.classList.add('active');
            setTimeout(() => {
                clockElement.classList.remove('active');
            }, 60000); // Remove active class after 1 minute
        }
        
        // Format time
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        clockElement.textContent = `${displayHours}:${displayMinutes} ${ampm}`;
        
        // Highlight if close to 4:20
        if ((hours === 4 && minutes >= 15 && minutes <= 25) || 
            (hours === 16 && minutes >= 15 && minutes <= 25)) {
            clockElement.classList.add('highlight');
        } else {
            clockElement.classList.remove('highlight');
        }
    }
    
    // Update clock every second
    updateClock();
    setInterval(updateClock, 1000);
}

// Initialize 420 clock when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setup420Clock();
});
