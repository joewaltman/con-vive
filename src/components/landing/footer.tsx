export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
        <p className="font-serif text-lg font-semibold text-charcoal">Con-Vive</p>
        <p className="body-sm text-warm-gray">Encinitas, CA</p>
        <a
          href="mailto:joe@con-vive.com"
          className="text-warm-gray transition-colors hover:text-terracotta"
        >
          joe@con-vive.com
        </a>
        <p className="body-sm mt-4 text-warm-gray">&copy; 2026 Con-Vive</p>
      </div>
    </footer>
  );
}
