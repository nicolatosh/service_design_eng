/**
 * This controller manages user operations.
 * Delegates the real "heavy" work to the user module.
 * Here there is the logic to manage user related api calls.
 */

import { Request, Response } from 'express';
import { signinUser, loginUser } from './user';

/**
 * Perform the signin process.
 * Requires a JSON body with nickname and password.
 * @param req 
 * @param res 
 */
export const signin = async (req: Request, res: Response) => {
 
    const response_body = req.body;
    const nickname = response_body['nickname'];
    const password = response_body['password'];
    
    //Checks on parameters
     if ((nickname != null && nickname!= " ") && (password != null && password!= " ")) {
       res.send(await signinUser(nickname,password));
     } else {
       res.status(400);
       res.send({ error: 'Supplied bad credentials to perform a signin' });
     }
};

/**
 * Perform the login process.
 * Requires a JSON body with nickname and password.
 * @param req 
 * @param res 
 */
export const login = async (req: Request, res: Response) => {

    const response_body = req.body;
    const nickname = response_body['nickname'];
    const password = response_body['password'];
   
    //Checks on parameters
     if ((nickname != null && nickname!= " ") && (password != null && password!= " ")){
       res.send(await loginUser(nickname,password));
     } else {
       console.log("bad asdad")
       res.status(400);
       res.send({ error: 'Supplied bad credentials to login' });
     }
  };