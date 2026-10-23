import express, {type Response,type Request} from "express";
import { createClient } from "redis"

const app = express();
app.use(express.json());

const redis = createClient({ url : "redis://localhost:6379"});
redis.on("error", (err)=> console.log(err));
redis.connect();



app.post("/job",async(req : Request, res : Response) =>{
    const data = req.body;
    await redis.lPush("job",JSON.stringify(data));
    
    const response = await redis.brPop("return",5);
   
    if(!response){
        return res.status(504).json({"message": "worker response timeout"});
    }
     const final = JSON.parse(response.element);
     console.log(final);
    res.send({"response ":final});
});





app.listen(3000,() =>console.log("server is running on port : 3000"));