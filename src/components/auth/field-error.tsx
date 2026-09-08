export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive mt-1" role="alert">{errors[0]}</p>;
}
