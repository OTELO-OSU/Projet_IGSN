import mjml2html from "mjml";

export async function renderMjml(
  template: string,
  values: Record<string, string>,
): Promise<string> {
  const { html } = await mjml2html(
    template.replace(/__[A-Z_]+?__/g, (name) => values[name] ?? name),
  );
  return html;
}
