import express from "express";
import { createClient } from "redis"

const app = express();
app.use(express.json());

const redis = createClient({ url : "redis://localhost:6379"});
redis.on("error", (err)=> console.log(err));
redis.connect();






async function main(){
    while(true){
        console.log("worker started , looking for the jobs");
        const data = await redis.brPop("job",3);
        

        if(!data){
            continue;
        }
        try{
            const payload = JSON.parse(data.element);
            const response = await processJob(payload);
            console.log("Response : ", response);
        }
        catch(error){
            console.log("errorr from catch block");
        }
    }
}

async function processJob(payload : unknown){
    const data = { success : true, payload : payload};
    await redis.rPush("return",JSON.stringify(data));
    return data;
}
main().catch(console.error);




app.listen(3001,() =>console.log("server is running on port : 3000"));