export default function AboutHero() {
  return (
    <section className="bg-brand-primary px-10 pt-16 pb-16 text-center max-[640px]:px-6 max-[640px]:pt-12 max-[640px]:pb-12 border-b border-green-800">
      <div className="max-w-[720px] mx-auto">
        <h1 className="font-archivo text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight font-bold mb-3">
          About FarmPass
        </h1>

        <p className="font-jakarta text-base sm:text-lg text-green-100/70 leading-relaxed max-w-[540px] mx-auto">
          Digital livestock transport permitting and movement verification system for the Municipality of Sariaya, Quezon.
        </p>
      </div>
    </section>
  );
}