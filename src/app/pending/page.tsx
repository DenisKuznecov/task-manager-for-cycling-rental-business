export default function PendingPage() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-2 bg-default-background py-12">
      <h1 className="text-heading-1 font-heading-1 text-default-font">
        Account pending
      </h1>
      <p className="text-body font-body text-subtext-color">
        Welcome! Your account is currently pending approval. Please contact an
        admin to assign your role.
      </p>
    </div>
  );
}
