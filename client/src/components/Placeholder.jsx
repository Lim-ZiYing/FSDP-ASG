// Temporary screen shown until the owner builds the real page.
export default function Placeholder({ title, owner, stories }) {
  return (
    <>
      <h1>{title}</h1>
      <p className="muted">Coming soon · {owner} · {stories}</p>
    </>
  );
}
