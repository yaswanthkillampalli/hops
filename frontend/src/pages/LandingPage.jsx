import { useEffect } from 'react';
import styles from '../styles/LandingPage.module.css';
import { FaShieldAlt, FaUsers, FaUser, FaPlay, FaChevronDown, FaTelegram } from 'react-icons/fa';

const LandingPage = () => {
  const handleLogin = (role) => {
    const messages = {
      admin: "Opening Admin Dashboard...",
      staff: "Loading Staff Operations Portal...",
      guest: "Connecting to Guest Experience..."
    };

    const toast = document.createElement('div');
    toast.className = styles.loginToast;
    toast.textContent = messages[role];
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2500);
  };

  useEffect(() => {
    const progressBar = document.getElementById('progressBar');

    const handleScroll = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      if (progressBar) progressBar.style.width = scrolled + "%";
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.container}>
      {/* Progress Bar */}
      <div id="progressBar" className={styles.progressBar} />

      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.logo}>
            Stay<span>Ops</span>AI
          </div>

          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#solution">Solution</a>
            <a href="#how">How it Works</a>
          </div>

          <div className={styles.authButtons}>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => handleLogin('admin')}>
              <FaShieldAlt /> Admin
            </button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => handleLogin('staff')}>
              <FaUsers /> Staff
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleLogin('guest')}>
              <FaUser /> Guest
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.badge}>Hospitality Operations Intelligence</div>
            <h1 className={styles.heroTitle}>
              Operations.<br />
              <span className={styles.highlight}>Reimagined.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Real-time coordination platform connecting bookings, rooms, parking, 
              luggage, staff, and guests through intelligent automation.
            </p>

            <div className={styles.heroButtons}>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`} onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
                <FaPlay /> Watch Demo
              </button>
              <button className={`${styles.btn} ${styles.btnOutlineLarge}`} onClick={() => handleLogin('guest')}>
                Try Guest Portal →
              </button>
            </div>

            <div className={styles.stats}>
              <div><strong>98%</strong> Faster Coordination</div>
              <div><strong>4.9s</strong> Guest Response</div>
              <div><strong>24/7</strong> Telegram Bot</div>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.dashboardMock}>
              <div className={styles.mockHeader}>
                <FaTelegram className={styles.telegramIcon} />
                <span>StayOps Bot • Online</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.scrollHint}>
          <FaChevronDown className={styles.bounce} />
          <p>Scroll to Explore</p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>Core Features</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚀</div>
            <h3>Real-time Sync</h3>
            <p>Instant updates across all departments</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🤖</div>
            <h3>AI Automation</h3>
            <p>Intelligent task distribution and routing</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Analytics Dashboard</h3>
            <p>Deep insights into operations</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2026 StayOps AI • Hospitality Operations Intelligence</p>
      </footer>
    </div>
  );
};

export default LandingPage;