import '@fortawesome/fontawesome-free/css/all.min.css';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import Stats from './components/Stats/Stats';
import Features from './components/Features/Features';
import Ecosystem from './components/Ecosystem/Ecosystem';
import CTABlocks from './components/CTABlocks/CTABlocks';
import SocialProof from './components/SocialProof/SocialProof';
import Footer from './components/Footer/Footer';

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Ecosystem />
        <CTABlocks />
        <SocialProof />
      </main>
      <Footer />
    </>
  );
}

export default App;
