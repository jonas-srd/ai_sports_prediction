import assert from "node:assert/strict";
import test from "node:test";
import { createRedditAuthorizationUrl, fetchRedditProfile, publishRedditTextPost } from "./index";

test("requests only identity and submit with permanent Reddit OAuth",()=>{const url=new URL(createRedditAuthorizationUrl({clientId:"id",redirectUri:"https://residualsports.com/api/reddit/oauth/callback"},"state"));assert.equal(url.searchParams.get("duration"),"permanent");assert.equal(url.searchParams.get("scope"),"identity submit");assert.equal(url.searchParams.get("state"),"state");});
test("reads Reddit profile and publishes a reviewed self post",async()=>{const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return calls===1?Response.json({id:"u1",name:"residualsports",snoovatar_img:"https://img.example/a.png"}):Response.json({json:{errors:[],data:{id:"t3_1",url:"https://reddit.com/r/sports/comments/1"}}});};try{assert.equal((await fetchRedditProfile("token","ua")).username,"residualsports");assert.equal((await publishRedditTextPost("token",{subreddit:"sports",title:"Title",body:"Body"},"ua")).id,"t3_1");}finally{globalThis.fetch=original;}});
