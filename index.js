const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const fs = require("fs");
const async = require("async");
const path = require("path");
// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'auth0';

// Create a new MongoClient
const client = new MongoClient(url);

// Use connect method to connect to the Server
client.connect(function (err) {
    assert.equal(null, err);
    console.log("Connected successfully to server");

    const db = client.db(dbName);
    helper(db);


    client.close();
});



function findTenantOwner(db, tenant) {
    console.log("Printing tenant name " + tenant);
    return new Promise((resolve, reject) => {
        const collection = db.collection("clients");
        collection.find({
            "tenant": tenant
        }).toArray(function (err, docs) {
            // console.log(docs);
            return resolve(docs);
        })
    })
}

function findAllTenants(db) {
    return new Promise((resolve, reject) => {
        const collection = db.collection("tenants");
        collection.find({}).toArray(function (err, docs) {
            assert.equal(err, null);
            if (err) {
                reject(err)
            }
            //  return callback(docs);
            //return docs;
            return resolve(docs)
        })
    });
};



function writeToFile(data, filename) {
    const da = JSON.stringify(data);
    return new Promise((resolve, reject) => {
        //  const path = `${path}${filename}.json`;
        const pa = path.join(__dirname + `/${filename}.json`)
        console.log(pa);
        fs.writeFile(pa, da, function (err) {
            // console.log(err);
            if (err) {
                reject(err)
            }
            resolve("written to file successfully")
        })
    });

}

const tenantNames = [];
var owners = [];
var ownersList = new Map();
const adminList = [];
const helper = async (db) => {
    // await getTenatsAndWriteToFile(db);

    //  await Promise.all([getTenatsAndWriteToFile(db),getClientsAndWriteTofile(db)])
    // async.parallel([getTenatsAndWriteToFile(db), getClientsAndWriteTofile(db), getAdminsAndWriteToFile(db)], function (err, results) {
    //     console.log(err);
    //     console.log(results);
    // });

    // await getTenatsAndWriteToFile(db);
    // await getClientsAndWriteTofile(db);
     await getAdminsAndWriteToFile(db);

    console.log("admin list " + adminList);
    console.log("owner List global : " + owners);

}

async function getClientsAndWriteTofile(db) {

    var obj = JSON.parse(fs.readFileSync(path.join(__dirname + "/tenantList.json"), 'utf8'));
    const tenants = obj;

    console.log(" Tenant names " + tenants);
    async.each(tenants, async function (tenant, callback) {
            console.log("Tenant Name" + tenant);
            const clients = await findTenantOwner(db, tenant);
            owners = [];
            clients.forEach(data => {
                // console.log("Inside loop  " + data.owners);
                if (data.owners) {
                    data.owners.forEach(ow => {
                        if (!owners.includes(ow)) {
                            owners.push(ow);
                        }

                    })
                    ownersList.set(tenant, owners);
                }

                // data.owners.forEach(ow => {
                //     //  console.log(ow);
                //     owners.push(ow);
            })
            //  });
            if (ownersList.size === tenants.length) {
                if (ownersList != null) {
                    const datatowrite = mapToJson(ownersList);
                    const writeOp = await writeToFile(datatowrite, "ownerList");
                    console.log(writeOp);
                }
            }
            callback(ownersList);

        },
        async function (err) {
            console.log("Owners from async :" + ownersList.size + " " + owners);

            console.log("owners " + ownersList);

        })

}

async function getTenatsAndWriteToFile(db) {
    const tenantList = await findAllTenants(db);
    tenantList.forEach(ele => {
        // console.log(ele.slug);
        tenantNames.push(ele.slug);
    });
    if (tenantNames != null) {
        await writeToFile(tenantNames, "tenantList");
    }
}
//const ownerListFromFiles = ["auth0|5c64190c5a9c6a0c95acb562", "auth0|5ab8c06fa9235309e95d7c8d", "auth0|5c3ef419da6d5a0e55794486", "admin@auth0.com"];

async function getAdminsAndWriteToFile(db) {
    //  console.log("owner list from admin list : "+owners);
    // console.log("Owner List : " + ownerListFromFiles);
    var obj = JSON.parse(fs.readFileSync(path.join(__dirname + "/ownerList.json"), 'utf8'));
    const ownerListFromFiles = jsonToMap( obj);
    console.log("OwnerListFrom File " + mapToJson( ownerListFromFiles));
    async.each(ownerListFromFiles, async function (ownerListFromFile, callback) {
            console.log("asy " + ownerListFromFile);

            const profile = await getAdminProfile(db, ownerListFromFile);

            if (profile != null) {
                console.log("Profile " + profile);
                adminList.push(profile);
            }
            callback;
        },
        async function (err) {
            console.log(err);
            console.log("Ad " + adminList.length);
            console.log("Admin List " + adminList);
            await writeToFile(adminList, "adminList")
            adminList.forEach(data => {
                //  console.log("Data " + data);
            })
        });
}


function getAdminProfile(db, id) {
    //console.log("Id :" + id);
    return new Promise((resolve, reject) => {
        const collection = db.collection("users");
        collection.findOne({
            "user_id": id
        }, function (err, doc) {
            if (err) {
                reject(err)
            }
            // console.log(doc);
            resolve(doc);
        })
    })
}

// async versions
function readFileData() {
    const pa = path.join(__dirname + `/ownerList.json`);
    fs.readFile(pa, function (err, data) {
        if (err) {
            console.log(err)
        };
        console.log(data);
        return data;
    })
}


function mapToJson(map) {
    return JSON.stringify([...map]);
}

function jsonToMap(jsonStr) {
    return new Map(JSON.parse(jsonStr));
}