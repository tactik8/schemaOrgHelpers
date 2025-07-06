import { schemaOrgHelpers} from './schemaOrgHelpers/schemaOrgHelpers.js'


async function test(){
    const data = await schemaOrgHelpers.get('height')
    console.log(data)
    
}

test()