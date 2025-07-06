import { schemaOrgHelpers } from './schemaOrgHelpers/schemaOrgHelpers.js'


async function test() {
    const data = await schemaOrgHelpers.getPropertyTypes('height')

    for(let d of data){
        console.log(d, await schemaOrgHelpers.getProperties(d))
    }
    //console.log(data)

}

test()