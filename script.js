const menuToggle = document.getElementById('mobile-menu');
const navLinks = document.getElementById('nav-links');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('is-active');
    navLinks.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(item => {
    item.addEventListener('click', () => {
        menuToggle.classList.remove('is-active');
        navLinks.classList.remove('active');
    });
});

window.onscroll = function() {
    let winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    let height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    document.getElementById("scrollBar").style.width = ((winScroll / height) * 100) + "%";
};

const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) navbar.classList.add('nav-scrolled');
    else navbar.classList.remove('nav-scrolled');
});

const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active');
        else entry.target.classList.remove('active');
    });
}, { threshold: 0, rootMargin: "0px 0px 50px 0px" });

revealElements.forEach(el => revealObserver.observe(el));

setTimeout(() => {
    revealElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if(rect.top < window.innerHeight) {
            el.classList.add('active');
        }
    });
}, 150);