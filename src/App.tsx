import { useCallback, useState } from 'react';
import { Preloader } from './components/Preloader';
import { SiteHead } from './components/SiteHead';
import { WaveField } from './components/WaveField';
import { Separator } from './components/Separator';
import { HeroTitle } from './components/HeroTitle';
import { AboutRoom } from './components/AboutRoom';
import { MemoryField } from './components/MemoryField';
import { CallToAction } from './components/CallToAction';
import { useLenis } from './hooks/useLenis';
import { resolveHeadline } from './lib/headline';

export default function App() {
  const [introDone, setIntroDone] = useState(false);
  const handleDone = useCallback(() => setIntroDone(true), []);
  useLenis();
  const headline = resolveHeadline();

  return (
    <>
      {!introDone && <Preloader onDone={handleDone} />}

      {/* the curtain that carries the theme change across the screen */}
      <div className="theme-mask" aria-hidden="true" />

      <SiteHead />

      <main>
        <div className="hero">
          <WaveField />
          <Separator />
          <HeroTitle text={headline} />
          <Separator />
        </div>
        {/* the hero's trailing rail doubles as this section's top edge; the one
            below marks where the panel is cut off */}
        <AboutRoom />
        <Separator />
        <MemoryField />
        <CallToAction />
      </main>
    </>
  );
}
