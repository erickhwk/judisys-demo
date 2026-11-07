/** Junta nomes de classe, ignorando os falsos. */
export function juntarClasses(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
