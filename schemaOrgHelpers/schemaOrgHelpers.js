

export const schemaOrgHelpers = {
    getAll: fetchSchemaGraph,
    get: getSchemaProperties
}

let schemaGraphCache = null;


async function fetchSchemaGraph() {
    if (schemaGraphCache) {
        return schemaGraphCache;
    }
    // The official URL for the latest version of the schema in JSON-LD format.
    const schemaUrl = 'https://schema.org/version/latest/schemaorg-all-http.jsonld';
    const response = await fetch(schemaUrl);
    if (!response.ok) {
        throw new Error(`Network response was not ok. Status: ${response.status}`);
    }
    const data = await response.json();
    schemaGraphCache = data['@graph']; // The graph contains all the definitions
    return schemaGraphCache;
}


async function getSchemaProperties(className) {
    // Ensure class name is properly capitalized (e.g., "movie" -> "Movie")
    const formattedClassName = className.charAt(0).toUpperCase() + className.slice(1);

    const graph = await fetchSchemaGraph();

    // Find the class definition in the graph
    const classDefinition = graph.find(node => node['@id'] === `schema:${formattedClassName}` && node['@type'] === 'rdfs:Class');

    if (!classDefinition) {
        throw new Error(`Class "${formattedClassName}" not found in the Schema.org vocabulary.`);
    }

    const properties = new Set();

    // Function to recursively find properties from parent classes
    const findProperties = (currentClassId) => {
        // Find all properties that have this class in their 'domainIncludes'
        graph.forEach(node => {
            if (node['@type'] === 'rdf:Property' && node['schema:domainIncludes']) {
                const domains = Array.isArray(node['schema:domainIncludes']) ? node['schema:domainIncludes'] : [node['schema:domainIncludes']];
                if (domains.some(domain => domain['@id'] === currentClassId)) {
                    properties.add(node['rdfs:label']);
                }
            }
        });

        // Find the definition of the current class to check for parent classes
        const currentClassDef = graph.find(node => node['@id'] === currentClassId);

        // Recursively check parent classes (subClassOf)
        if (currentClassDef && currentClassDef['rdfs:subClassOf']) {
             const parents = Array.isArray(currentClassDef['rdfs:subClassOf']) ? currentClassDef['rdfs:subClassOf'] : [currentClassDef['rdfs:subClassOf']];
             parents.forEach(parent => findProperties(parent['@id']));
        }
    };

    findProperties(`schema:${formattedClassName}`);

    // Return the properties as a sorted array
    return Array.from(properties).sort();
}