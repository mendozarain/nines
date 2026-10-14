export function PageHeader({ eyebrow, title, description, children }: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        {eyebrow && <span className="label-mono text-link">{eyebrow}</span>}
        <h1 className="text-[28px] leading-[34px] font-medium tracking-[-0.015em]">{title}</h1>
        {description && <p className="max-w-xl text-subtle-foreground">{description}</p>}
      </div>
      {children}
    </header>
  );
}
