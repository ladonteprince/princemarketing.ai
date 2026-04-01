'use client';

export function HeroVideo() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden hidden lg:block">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/images/hero-forge.png"
        className="h-full w-full object-cover opacity-15"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
      {/* Gradient overlay to maintain text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-void/60 via-void/40 to-void/80" />
    </div>
  );
}
