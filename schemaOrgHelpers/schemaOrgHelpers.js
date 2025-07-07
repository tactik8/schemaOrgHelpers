/**
 *
 * @type:
 * - rdfs:Class
 * - rdf:Property
 * - schema:DataType
 * - rdfs:Datatype
 * 
 */




export const schemaOrgHelpers = {
    test: test,
    get: get,
    record: {
        get: getSampleRecord
    },
    class: {
        get: getClass
    },
    property: {
        get: getProperty
    },
    properties: {

    },
    jsonSchema: {
        get: getJsonSchema
    }

}

let schemaGraphCache = null;
let classNamesDB = []
let propertyNamesDB = []
let datatypesNamesDB = []
let DB = {}
let classDB = {}
let hierarchyDB = {}
let enumerationsDB = {}

let MAXDEPTH = 0



// -----------------------------------------------------
//  API 
// -----------------------------------------------------


async function get(name) {
    const graph = await fetchSchemaGraph();
    name = name.startsWith('schema:') ? name : `schema:${name}`

    return DB?.[name]
}

async function getProperty(propertyID) {
    const graph = await fetchSchemaGraph();
    propertyID = propertyID.startsWith('schema:') ? propertyID : `schema:${propertyID}`

    return DB?.[propertyID]
}

async function getProperties(className) {
    const graph = await fetchSchemaGraph();
    className = className.startsWith('schema:') ? className : `schema:${className}`
    return classDB?.[className]
}

async function getClass(className) {
    const graph = await fetchSchemaGraph();

    className = className.startsWith('schema:') ? className : `schema:${className}`
    return DB?.[className]
}


// -----------------------------------------------------
//  Comment 
// -----------------------------------------------------

async function test() {

    let cache = await init()


    let parents = getParents("schema:ActionStatusType")

    let record = getSampleRecord("Action")

    let r2 = getJsonSchema("Thing")

    
    downloadJson(r2,)
    console.log('r', r2)

    console.log('r2', JSON.stringify(r2, null, 4))
}


function downloadJson(jsonObj, filename) {
    // 1. Convert the JavaScript object to a JSON string.
    // The third argument (2) is for pretty-printing the JSON with an indentation of 2 spaces.
    const jsonString = JSON.stringify(jsonObj, null, 2);

    // 2. Create a Blob from the JSON string.
    // A Blob (Binary Large Object) is a file-like object of immutable, raw data.
    const blob = new Blob([jsonString], { type: "application/json" });

    // 3. Create a URL for the Blob.
    // This URL can be used to reference the Blob data.
    const url = URL.createObjectURL(blob);

    // 4. Create a temporary anchor (<a>) element to trigger the download.
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'data.json'; // Set the download attribute with the desired filename.

    // 5. Append the anchor to the body, trigger the click, and then remove it.
    document.body.appendChild(a);
    a.click();

    // 6. Clean up by revoking the object URL and removing the anchor element.
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// -----------------------------------------------------
//  Init DB 
// -----------------------------------------------------


async function init() {
    return await fetchSchemaGraph()
}

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

    // Build DB
    DB = buildDB(schemaGraphCache)

    // Build classNames
    classNamesDB = buildClassNamesDB(schemaGraphCache)

    // Build propertyNames
    propertyNamesDB = buildPropertyNamesDB(schemaGraphCache)

    // Build datatypesNames
    datatypesNamesDB = buildDatatypesNamesDB(schemaGraphCache)


    // Build hierarchyDB
    hierarchyDB = buildHierarchyDB(schemaGraphCache)


    // Build classDB
    classDB = buildClassDB(schemaGraphCache)

    // Build enumerationsDB
    enumerationsDB = buildEnumerationsDB(schemaGraphCache)


    // 
    return schemaGraphCache;
}

function buildDB(graph) {

    let db = {}
    for (let node of graph) {
        db[node['@id']] = node
    }
    return db
}


function buildClassNamesDB(graph) {
    /**
     * Build a names DB
     * @param graph
     */
    let db = []
    for (let node of graph) {

        let className = 'rdfs:Class'

        let record_types = node['@type'] || []
        record_types = Array.isArray(record_types) ? record_types : [record_types]


        if (record_types.includes(className)) {
            db.push(node['@id'])
        }
    }
    return db
}

function buildPropertyNamesDB(graph) {
    /**
     * Build a names DB
     * @param graph
     */
    let db = []
    for (let node of graph) {

        let className = 'rdf:Property'

        let record_types = node['@type'] || []
        record_types = Array.isArray(record_types) ? record_types : [record_types]


        if (record_types.includes(className)) {
            db.push(node['@id'])
        }


    }
    return db
}

function buildDatatypesNamesDB(graph) {
    /**
     * Build a names DB
     * @param graph
     */
    let db = ['schema:URL']
    for (let node of graph) {

        let className1 = 'schema:DataType'
        let className2 = 'rdf:datatype'

        let record_types = node['@type'] || []
        record_types = Array.isArray(record_types) ? record_types : [record_types]


        if (record_types.includes(className1) || record_types.includes(className2)) {
            db.push(node['@id'])
        }

    }
    return db
}

function buildHierarchyDB(graph) {
    /**
     * Build a hierarchy DB
     * @param graph
     */
    let db = {}
    for (let node of graph) {

        if (node['@type'] !== 'rdfs:Class') {
            continue
        }


        let record_id = node['@id']

        let parents = node?.['rdfs:subClassOf'] || []
        parents = Array.isArray(parents) ? parents : [parents]
        parents = parents.map(x => x['@id'])

        // Create in db and assign parents

        db[record_id] = db?.[record_id] || {}
        db[record_id]['parents'] = parents

        // Assign as child to parents
        for (let p of parents) {
            db[p] = db?.[p] || {}
            db[p]['children'] = db[p]?.['children'] || []
            db[p]['children'].push(record_id)
            db[p]['children'] = [...new Set(db[p]['children'])]
            db[p]['children'] = db[p]['children'].filter(x => x !== undefined)

        }

    }
    return db
}



function buildClassDB(graph) {


    let db = {}

    let fnAddClass = function(db, className) {
        db[className] = db?.[className] || {}
        db[className]['@type'] = db[className]['@type'] || []
        db[className]['@type'].push(className)
        return db
    }

    let fnAddProperty = function(db, className, propertyID, types) {
        db[className] = db?.[className] || {}
        db[className][propertyID] = db?.[className]?.[propertyID] || []
        db[className][propertyID] = db[className][propertyID].concat(types)
        return db
    }

    for (let node of graph) {

        let record_types = node['@type'] || []
        let record_id = node?.['@id']
        record_types = Array.isArray(record_types) ? record_types : [record_types]


        if (record_types.includes('rdfs:Class')) {
            db = fnAddClass(db, record_id)
        }

        if (record_types.includes('rdf:Property')) {
            //
            let propertyID = node['@id']
            let propertyName = node['rdfs:label']
            let propertyDomains = getDomains(propertyID)
            let propertyTypes = getPropertyTypes(propertyID)

            for (let domain of propertyDomains) {
                db = fnAddProperty(db, domain, propertyID, propertyTypes)

                // Get children of the domain

                let childrens = getChildrens(domain)
                childrens.map(x => db = fnAddProperty(db, x, propertyID, propertyTypes))

            }
        }
    }

    return db
}


function buildEnumerationsDB(graph) {
    /**
     * Build a enumerations DB
     * @param graph
     * @returns {Object}
     * 
     */


    let db = {}


    let enumerations = []

    for (let node of graph) {

        let record_types = node['@type'] || []
        record_types = Array.isArray(record_types) ? record_types : [record_types]
        let record_id = node?.['@id']

        let parents = getParents(record_id)
        if (parents.includes('schema:Enumeration')) {
            enumerations.push(record_id)
        }

    }

    for (let node of graph) {

        let record_types = node['@type'] || []
        record_types = Array.isArray(record_types) ? record_types : [record_types]
        let record_id = node?.['@id']


        for (let t of record_types) {
            if (enumerations.includes(t)) {
                db[t] = db?.[t] || []
                db[t].push(record_id)
            }
        }

    }

    return db

}



// -----------------------------------------------------
//  Class methods 
// -----------------------------------------------------


function getClassProperties(className) {
    /**
     * Get all properties of a class
     * @param className
     * @returns {Array} @id of properties
     * */
    className = className.startsWith('schema:') ? className : `schema:${className}`
    return classDB?.[className]
}


function getParents(className) {
    /**
     * Get all parents of a class
     * @param className
     * @returns {Array} @id of parents
     */




    let parents = hierarchyDB?.[className]?.['parents'] || []
    parents = Array.isArray(parents) ? parents : [parents]

    for (let p of parents) {
        let p_parents = getParents(p)
        parents = [...parents, ...p_parents]
    }
    parents = [...new Set(parents)]
    parents = parents.filter(x => x !== undefined)

    return parents
}

function getChildrens(className) {
    /**
     * Get all childrens of a class
     * @param className
     * @returns {Array} @id of childrens
     * */




    let records = hierarchyDB?.[className]?.['children'] || []
    records = Array.isArray(records) ? records : [records]

    for (let r of records) {
        let r_other = getChildrens(r)
        if (r_other && r_other.length !== 0) {
            records = [...records, ...r_other]
        }

    }
    records = [...new Set(records)]
    records = records.filter(x => x !== undefined)
    records = Array.isArray(records) ? records : [records]
    return records

}


// -----------------------------------------------------
//  Property methods 
// -----------------------------------------------------

function getDomains(propertyID) {
    /**
     * Get all domains of a property, classes in which the property belongs
     * @param propertyID
     * @returns {Array} @id of domains
     */



    let node = DB[propertyID]
    let domains = node?.['schema:domainIncludes'] || []
    domains = Array.isArray(domains) ? domains : [domains]
    domains = domains.map(x => x['@id'])
    domains = [...new Set(domains)]
    domains = domains.filter(x => x !== undefined)
    domains = domains || []
    return domains
}


function getPropertyTypes(propertyID) {
    /**
     * Get all types of a property
     * @param propertyID
     * @returns {Array} @id of types
     */



    let node = DB[propertyID]
    let ranges = node?.['schema:rangeIncludes'] || []
    ranges = Array.isArray(ranges) ? ranges : [ranges]
    ranges = ranges.map(x => x['@id'])
    return ranges
}


function getPropertyEnumerations(className) {
    /**
     * Get all enumerations of a property
     * @param className
     * @returns {Array} @id of enumerations
     * 
     */

    return enumerationsDB?.[className] || []

}




function getHmtlSchema(className, maxDepth = MAXDEPTH, depth = 0) {
    /**
     * Get html schema of a class
     * @param className
     * @returns {Object} html schema
     * @param depth
     * @returns {Object} html schema
     * */



}



function getJsonSchema(className, maxDepth = MAXDEPTH, depth = 0, addHtmlType = false) {
    /**
     * Get json schema of a class
     * @param className
     * @returns {Object} json schema
     * @param depth
     * @returns {Object} json schema
     */




    className = className.startsWith('schema:') ? className : `schema:${className}`
    let shortClassName = className.split(':')[1]
    let node = DB[className]


    // Init schema
    let schema = {
        //"$schema": "https://json-schema.org/draft/2020-12/schema",
        //"$id": `https://schema.org/${shortClassName}`,
        "title": className,
        "description": node['rdfs:comment'],
        
    }


    // Add html type
    if (addHtmlType) {
        let htmlDatetypes = ['schema:Date', 'schema:DateTime', 'schema:Time']
        let htmlNumbertypes = ['schema:Integer', 'schema:Number', 'schema:Float']
        let htmlStringtypes = ['schema:Text', 'schema:CssSelectorType', 'schema:PronounceableText', 'schema:URL', 'schema:XPathType']
        let htmlBooleantypes = ['schema:Boolean', 'schema:Bool', 'schema:True', 'schema:False']
        let htmlEmailtypes = ['schema:Email']
        let htmlTelephonetypes = ['schema:Telephone']
        let htmlUrltypes = ['schema:URL']
        let htmlColortypes = ['schema:Color']
        let htmlImagetypes = ['schema:ImageObject']
        let htmlCheckboxtypes = ['schema:Bool']

        if (htmlDatetypes.includes(className)) {
            schema['htmlType'] = 'date'
        }
        if (htmlNumbertypes.includes(className)) {
            schema['htmlType'] = 'number'
        }
        if (htmlStringtypes.includes(className)) {
            schema['htmlType'] = 'text'
        }
        if (htmlBooleantypes.includes(className)) {
            schema['htmlType'] = 'checkbox'
        }
        if (htmlEmailtypes.includes(className)) {
            schema['htmlType'] = 'email'
        }
        if (htmlTelephonetypes.includes(className)) {
            schema['htmlType'] = 'tel'
        }
        if (htmlUrltypes.includes(className)) {
            schema['htmlType'] = 'url'
        }
        if (htmlColortypes.includes(className)) {
            schema['htmlType'] = 'color'
        }
        if (htmlImagetypes.includes(className)) {
            schema['htmlType'] = 'image'
        }

    }


    // Handle enumeration
    let parents = getParents(className)
    if (parents.includes('schema:Enumeration')) {
        let enums = getPropertyEnumerations(className)
        if (enums && enums.length > 0) {

            let results = []
            for (let e of enums) {
                let enumNode = DB[e]
                let r = {
                    "type": "string",
                    "const": e,
                    "title": enumNode?.['rdfs:label'],
                    "description": enumNode?.['rdfs:comment'] || ''
                }
                results.push(r)
            }

            schema['enum'] = results
        }
        return schema
    }


    // Handle dataTypes
    let integerJsonSchemaTypes = ['schema:Integer']
    let numberJsonSchemaTypes = ['schema:Number', 'schema:Float']
    let stringJsonSchemaTypes = ['schema:Text', 'schema:CssSelectorType', 'schema:PronounceableText', 'schema:URL', 'schema:XPathType', 'schema:Time', 'schema:Date', 'schema:DateTime']
    let booleanJsonSchemaTypes = ['schema:Boolean']

    if (datatypesNamesDB.includes(className)) {

        
        if (integerJsonSchemaTypes.includes(className)) {
            schema["type"] = "integer" 
        }

        if (numberJsonSchemaTypes.includes(className)) {
            schema["type"] = "number" 
        }

        if (stringJsonSchemaTypes.includes(className)) {
            schema["type"] = "string" 
        }

        if (booleanJsonSchemaTypes.includes(className)) {
            schema["type"] = "boolean" 
        }


        return schema
    }



    // Handle Classes

    if (depth > maxDepth) {
       // schema['$ref'] = `https://schema.org/${shortClassName}`
        schema['type'] = 'string'
        return schema
    }

    // Handle objects
    schema['type'] = 'object'
    schema['properties'] = {
        "@type": {
            "type": "string",
            "const": [className],
            "description": "The type of the object."
        },
        "@id": {
            "type": "string",
            "description": "The unique identifier of the object."
        }
    }

    
    let properties = getClassProperties(className)
    for (let propertyID in properties) {

        let propertyNode = DB[propertyID]
        let shortPropertyID = propertyID.split(':')[1]
        schema['properties'][propertyID] = {}
        schema['properties'][propertyID]['oneOf'] = []

        let types = properties[propertyID]


        // Handle multiple types
        let results = []
        for (let t of types) {
            let result = getJsonSchema(t, maxDepth, depth + 1)
            result['description'] = propertyNode?.['rdfs:comment'] || ''
            result['title'] = propertyNode?.['rdfs:label'] || ''

            result = { "type": "array", "items": result }
            results.push(result)
        }


        if (results.length > 1) {
            for (let t of types) {
                schema['properties'][propertyID]['oneOf'] = results
            }

        } else {
            schema['properties'][propertyID] = results?.[0]
        }

    }
    return schema

}



function getSampleRecord(className, maxDepth = MAXDEPTH, depth = 0) {


    if (depth > maxDepth) {
        return className
    }



    className = className.startsWith('schema:') ? className : `schema:${className}`



    // Handle enumeration
    let parents = getParents(className)
    if (parents.includes('schema:Enumeration')) {
        let enums = getPropertyEnumerations(className)
        if (enums && enums.length > 0) {
            return enums
        }
    }


    // Handle dataTypes
    if (datatypesNamesDB.includes(className)) {
        return `<${className}>`
    }

    // Handle Classes
    let record = getClassProperties(className)
    let newRecord = {
        "@type": className
    }

    for (let propertyID in record) {
        if (propertyID === '@type') {
            continue
        }

        // Types
        let types = record[propertyID]
        newRecord[propertyID] = []
        for (let t of types) {
            newRecord[propertyID].push(getSampleRecord(t, maxDepth, depth + 1))
        }


    }


    return newRecord

}


