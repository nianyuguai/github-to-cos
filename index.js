const axios = require('axios')
const COS = require('cos-nodejs-sdk-v5')
const fs = require('fs')
const util = require('util')

var putObjectSync = null
var SECRET_ID = ''
var SECRET_KEY = ''
var scripts = []

var gallyJson = [{
    json: "https://jdsharedresourcescdn.azureedge.net/jdresource/lxk0301_gallery.json",
    cdn: "https://jdsharedresourcescdn.azureedge.net/jdresource"
}]


!(async() => {
    console.time('github-to-cos')
    console.log('====== start github-to-cos =====\n')
    let ok = await initConfig()
    if (ok) {
        await main()
    }
    console.log('\n====== end github-to-cos =====')
    console.timeEnd('github-to-cos')
})()

async function initConfig() {

    if (!process.env.SECRET_ID || !process.env.SECRET_KEY) {
        console.log('Secret请填写COS密钥 SECRET_ID 和 SECRET_KEY ')
        return false
    }

    if (!process.env.BUCKET || !process.env.REGION) {
        console.log('Secret请填写COS桶名 BUCKET 和 REGION')
        return false
    }

    // 映射脚本路径
    for (let item of gallyJson) {
        let json = item.json
        let boxJson = await restFile(json)

        if (!boxJson.task) {
            continue
        }

        for (let task of boxJson.task) {
            let script = task.config.match(/.*\/(.+?\.js)/)[1];
            scripts.push({
                key: script,
                value: `${item.cdn}/${script}`
            })
        }
    }

    if (scripts.length === 0) {
        console.log('脚本列表为空')
        return false
    }

    return true
}


async function main() {

    const cos = new COS({
        SecretId: process.env.SECRET_ID,
        SecretKey: process.env.SECRET_KEY
    })
    putObjectSync = util.promisify(cos.putObject.bind(cos))

    let okList = []
    let failList = []
    await asyncPool(5, scripts, script => new Promise(async(resolve) => {
        try {
            let sc = await upload(script)
            if(sc){
                okList.push(script.key)
            }else{
                failList.push(script.key)
            }
        } finally {
            resolve()
        }
    }))
    console.log(`【成功上传文件】: \n`, okList.join("\n"))
    console.log(`【未上传文件(可能已过期)】: \n`, failList.join("\n"))

}

async function upload(script) {
    let jsKey = script.key
    let url = script.value

    let js = await restFile(url)

    if (js == null || js == '' || js == undefined) {
        return ''
    }

    let localJs = `${jsKey}`
    await fs.writeFileSync(localJs, `\ufeff${js}`, 'utf8', async(err) => {
        if (err) {
            console.log('write js err.', err)
        } else {
            console.log('write js ok')
        }
    })

    const params = {
        // 桶名
        Bucket: process.env.BUCKET,
        Region: process.env.REGION,
        // 桶对象
        Key: jsKey,
        // 文件
        Body: fs.readFileSync(localJs)
    }
    await putObjectSync(params)
    //console.log(`上传: ${jsKey}`)

    return jsKey
}

function asyncPool(poolLimit, array, iteratorFn) {
    let i = 0;
    const ret = [];
    const executing = [];
    const enqueue = function () {
        if (i === array.length) {
            return Promise.resolve();
        }
        const item = array[i++];
        const p = Promise.resolve().then(() => iteratorFn(item, array));
        ret.push(p);

        let r = Promise.resolve();

        if (poolLimit <= array.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= poolLimit) {
                r = Promise.race(executing);
            }
        }

        return r.then(() => enqueue());
    };
    return enqueue().then(() => Promise.all(ret));
}

async function restFile(url) {
    return new Promise(async(resovle) => {
        let name = fileName(url)
        axios.defaults.headers.post['Content-Type'] = 'application/json;charset=UTF-8';
        let content = ''
        await axios({
            method: 'get',
            url: url
        }).then(res => {
            console.log(`获取文件成功: ${name}`)
            content = res.data
        }).catch(err => {
            console.log('获取签到文件失败: ', err.message)
        })

        resovle(content)
    })
}

async function downFile(url) {
    return new Promise(async(resovle) => {
        let name = fileName(url)
        let local = ''
        await axios({
            method: 'get',
            url: url,
            responseType: 'stream'
        }).then(res => {
            const rs = res.data
            local = `${name}`
            const ws = fs.createWriteStream(local)
            rs.pipe(ws)
            // console.log(`下载文件成功: ${name}`)
        }).catch(res => {
            // console.log(`下载文件失败: ${name}`)
        })

        resovle(local)
    })
}

function fileName(url) {
    if (url) {
        var pos = url.lastIndexOf("/");
        if (pos == -1) {
            pos = url.lastIndexOf("\\")
        }
        return url.substr(pos + 1)
    }
    return "";
}
