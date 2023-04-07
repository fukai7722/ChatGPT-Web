import express from 'express'
import type { RequestProps } from './types'
import type { ChatMessage } from './chatgpt'
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json())

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { prompt, options = {}, systemMessage } = req.body as RequestProps
    let firstChunk = true
    await chatReplyProcess({
      message: prompt,
      lastContext: options,
      process: (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      },
      systemMessage,
    })
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})

router.post('/config', auth, async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body as { username: string, password: string }
    if (!username)
      throw new Error('缺少用户名')
    if (!password)
      throw new Error('缺少密码')

    const userModel = require('./mongo/userModel');
    var md5 =require("md5");
  
    const findData = await userModel.findOne({ username: username });
    console.log(findData)
    if(findData && findData['password'] == md5(password)){

      const jwt = require('jsonwebtoken');

      const secretKey = 'wangchen'; // 设置密钥
      const payload = { username: username }; // 设置负载

      // 生成 JWT
      const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

      console.log(token); // 输出生成的 JWT
      findData['password'] = null;
      res.send({ status: 'Success', message: "登录成功", data: {token:token,user:findData} })
      return;
    }else{
      res.send({ status: 'Fail', message: "用户名密码不正确", data: null })
    }
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }

})

router.post('/add', async (req, res) => {
  

  try {
    const { username, password } = req.body as { username: string, password: string }
    if (!username)
      throw new Error('缺少用户名')
    if (!password)
      throw new Error('缺少密码')




    const userModel = require('./mongo/userModel');
    var md5 =require("md5");
    
    const findData = await userModel.findOne({ username: username });
    console.log(findData)
    if(findData){
      res.send({ status: 'Fail', message: "用户名已存在", data: null })
      return;
    }

    // 通过实例化model创建文档
    let userDoc = new userModel({
      username: username,
      password: md5(password),
      status:1,
      createtime: new Date(),
    })

    const resData = await userDoc.save();
    console.log(resData)
    res.send({ status: 'Success', message: '添加成功', data: null })

    // userDoc.save().then((doc) => {
    //   console.log(doc)
    //   res.send({ status: 'Success', message: '添加成功', data: null })
    // })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }


})


router.get('/userlist', async (req, res) => {
  const userModel = require('./mongo/userModel');

  try {
    const pageNumber = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;  

    console.log('pageNumber',pageNumber)
    console.log('pageSize',pageSize)

    const skipAmount = (pageNumber - 1) * pageSize;
    const list = await userModel.find({},{ username: 1, createtime: 1, status:1 }).skip(skipAmount).limit(pageSize).sort({ createtime: -1 });
    const totalRecords = await userModel.countDocuments();

    const returnData = {
      total:totalRecords,
      list:list
    }
    res.send({ status: 'Success', message: '', data: returnData })

  }catch(error){
    res.send({ status: 'Fail', message: error.message, data: null })
  }

})

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
