document.addEventListener('DOMContentLoaded', () => {
    const welcomeMessage = document.getElementById('welcome-message');
    const enterButton = document.getElementById('enter-button');

    anime({
        targets: '#welcome-message',
        opacity: [0, 1],
        duration: 2000,
        easing: 'easeOutExpo'
    });

    anime({
        targets: '#enter-button',
        opacity: [0, 1],
        duration: 2000,
        delay: 1000, // Delay button animation until after message fades in
        easing: 'easeOutExpo'
    });

    enterButton.addEventListener('click', () => {
        localStorage.setItem('hasVisited', 'true');
        window.location.href = 'index.html';
    });
});
