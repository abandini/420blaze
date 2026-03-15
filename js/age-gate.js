// Age Gate - 420Blazin.com
(function() {
    if (localStorage.getItem('420blazin_age_verified') === 'true') return;

    var gate = document.createElement('div');
    gate.className = 'age-gate';
    gate.innerHTML = '<div class="age-gate-box">' +
        '<h2>Are You 21 or Older?</h2>' +
        '<p>420Blazin.com contains content and products intended for adults aged 21 and over. By entering, you confirm you meet the legal age requirement in your jurisdiction.</p>' +
        '<div class="age-gate-buttons">' +
        '<button class="age-gate-yes" onclick="verifyAge()">Yes, I\'m 21+</button>' +
        '<button class="age-gate-no" onclick="denyAge()">No, I\'m Not</button>' +
        '</div></div>';
    document.body.appendChild(gate);

    window.verifyAge = function() {
        localStorage.setItem('420blazin_age_verified', 'true');
        gate.classList.add('hidden');
    };

    window.denyAge = function() {
        window.location.href = 'https://www.google.com';
    };
})();
