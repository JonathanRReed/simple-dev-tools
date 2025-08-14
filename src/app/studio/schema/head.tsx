export default function Head() {
  return (
    <>
      <title>Schema & Types Studio | Simple-Dev-Tools</title>
      <meta
        name="description"
        content="Validate JSON/YAML/OpenAPI, preview docs, and generate TypeScript types."
      />
      {/* Swagger UI CSS for docs preview */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist/swagger-ui.css"
      />
    </>
  );
}
