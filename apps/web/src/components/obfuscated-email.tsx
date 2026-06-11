type ObfuscatedEmailProps = {
  reversedDomain: string;
  reversedLocalPart: string;
};

export function ObfuscatedEmail({ reversedDomain, reversedLocalPart }: ObfuscatedEmailProps) {
  const localPart = reverse(reversedLocalPart);
  const domain = reverse(reversedDomain);

  return (
    <span className="obfuscatedEmail" aria-label="Email address">
      <span>{localPart}</span>
      <span aria-hidden="true">@</span>
      <span>{domain}</span>
    </span>
  );
}

function reverse(value: string): string {
  return [...value].reverse().join("");
}
