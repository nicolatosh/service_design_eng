
import { Error, GameMatch, GameMatchImpl, Match, MatchStats, MatchStatsTemporany } from "./types";
import config from "../config"
import { json } from "body-parser";
import { GAME_MODE, GAME_STATUS, MAX_MATCHES } from "./game_types";
import { getMatchFromService, getRandom } from "./utils";
import e from "express";

const axios = require('axios').default;

//Server resources, should be accessed only via REST methods
export var games: GameMatch[] = Array(); 
var gamesTimers: Map<String, NodeJS.Timeout> = new Map<String, NodeJS.Timeout>();
var opponentConnectionTimers: Map<String, NodeJS.Timeout> = new Map<String, NodeJS.Timeout>();
var localGamesStats: Map<String, MatchStats> = new Map<String, MatchStats>();
var temporanyMatchStats: Map<String, MatchStatsTemporany> = new Map<String, MatchStatsTemporany>();



export const getWelcome: (name: string) => { text: string } = (name) => {
  return {
    text: `Hello ${name} CIAO`,
  };
};

/**
 * Creates an instance of "game" which is a container for
 * all game related info so that the game instace can be 
 * interpreted and understood from users
 * 
 * @param gamemode one of available 
 * @param matchtype one of available 
 */
export const buildGame: (gamemode: string, matchtype: string) => Promise<GameMatch | Error> = async (gamemode, matchtype) => {
  
    let match = await getMatchFromService(matchtype);
    if(match){
      let gameId = getRandom();
      switch(gamemode){
        case GAME_MODE.Single:
          games.push(new GameMatchImpl(gameId,gamemode,GAME_STATUS.Started,match));
          startMatchTimer(gameId);
          break;
        case GAME_MODE.Multiplayer:
          //we set the game in waiting other player mode
          //the opponent has a limited time to join the game
          games.push(new GameMatchImpl(gameId,gamemode,GAME_STATUS.Waiting_opponent_connection,match));
          startOpponentConnectionTimer(gameId);
          break;
      }
    }
    return games[games.length-1];
};

/**
 * Function to allow another user to play a multyplayer game.
 * @param gameid 
 * @param userid 
 */
export const opponentJoinGame: (gameid: string, userid: string) => Promise<true|false> = async (gameid,userid) => {
  const game = games.filter(e => e.gameid === gameid);
  var actual_game = game[0];

  //TODO check user id in Db
  if(actual_game && actual_game.game_status === GAME_STATUS.Waiting_opponent_connection){
    games[games.indexOf(actual_game)].game_status = GAME_STATUS.Started;
    return true
  }
  return false
};

/*TODO consider "select_ingredients" types of matches
/**
 * This function is the core of game logic. Once user 
 * 
 * @param gameid 
 * @param answer 
 */
export const processInput: (gameid: string, answer: string[], userid: string) => Promise<GameMatch | any> = async (gameid,answer,userid) => {
  
  const game = games.filter(e => e.gameid === gameid);
  var actual_game = game[0];
  const timer = gamesTimers.get(gameid);

  //at first check if game exist and timer for match is not expired
  if(actual_game && timer){

      //separate cases for single player mode and multyplayer
      switch(actual_game.gamemode){

        case GAME_MODE.Single:

          //checking user answer 
          if(checkAnswer(actual_game,answer)){

            //at this point user has sent correct answer need to check
            //game current status and perform the right action
            //also need to stop match timer
            stopMatchTimer(gameid);
            console.log("User won the match: ", actual_game.matches[actual_game.matches.length-1]);
            //saving some stats
            localGamesStats.set(gameid, { "matchid": actual_game.matches[actual_game.matches.length-1].id, "winnerid": userid});
            switch (actual_game.game_status){
              case GAME_STATUS.Started:

                //if it is not the last match, just create a new one of the same type
                if(actual_game.matches.length < MAX_MATCHES){    
                  try {
                    
                    //getting new match
                    let new_match = await getMatchFromService(actual_game.matches[0].match_type)
                    if(new_match){
                      games[games.indexOf(actual_game)].matches.push(new_match);
                    }else{ return "Error getting match"; }
                    console.log("Started new match:", new_match);

                    //restarting timer for this new match
                    startMatchTimer(gameid);
                    return games[games.indexOf(actual_game)];
                  } catch (error) {
                    return e.toString();
                  }   
                }else{
                  //at this point user finished all matches in the game
                  games[games.indexOf(actual_game)].game_status = GAME_STATUS.Game_end;
                  console.log("Game finished!");
                  gameEnd(gameid);
                  return "Game finished!";
                }

              case GAME_STATUS.Game_end:
                return "Game finished! No more response allowed";
            }
          }else{return "Wrong answer"}
        break;

        case GAME_MODE.Multiplayer:
        
          if(checkAnswer(actual_game,answer)){
            stopMatchTimer(gameid);
            //at this point user has sent correct answer need to check
            //game current status and perform the right action
            console.log("User won the match: ", actual_game.matches[actual_game.matches.length-1]);
            //saving some stats
            localGamesStats.set(gameid, { "matchid": actual_game.matches[actual_game.matches.length-1].id, "winnerid": userid});

            switch (actual_game.game_status){
              case GAME_STATUS.Started:
                /**set match won, save stats, SYNC game => send post to both users */
                break;
              
              case GAME_STATUS.Opponent_wrong_response:
                //assuring that user who sent a bad response do not send the right one now
                if(temporanyMatchStats.get(gameid)?.bad_response_userid === userid){
                  return "You cannot send another response";
                }else{
                  /**set match won, save stats, SYNC game => send post to both users */
                }

                break;
            }

          //manage WRONG answers
          }else{
            switch (actual_game.game_status){

              //user send bad response
              case GAME_STATUS.Started:
                //bad response. Game is now set to allow only answers from the other opponent
                temporanyMatchStats.set(gameid, {"matchid": actual_game.matches[actual_game.matches.length-1].id, "bad_response_userid": userid });
                games[games.indexOf(actual_game)].game_status = GAME_STATUS.Opponent_wrong_response;
                console.log("Wrong answer from user:", userid);
                return "Wrong answer";

              //this case means that both users have sent a bad answer
              //game can go to next match.
              case GAME_STATUS.Opponent_wrong_response:

                //user who already sent a bad answer cannot send nothing more
                if(temporanyMatchStats.get(gameid)?.bad_response_userid === userid){
                  return "You cannot send another response";
                }else{
                  games[games.indexOf(actual_game)].game_status = GAME_STATUS.Both_user_failure;
                  return "Wrong answer";
                }
            }
          }

        break;
      }

    }else{
      return "Game not found"
    }
};


/**
 * Set the game to "end" status.
 * @param gameid 
 */
function gameEnd(gameid: string): void {

  const game = games.filter(e => e.gameid === gameid);
  game[0].gamemode = GAME_STATUS.Game_end;
  //games.splice(games.indexOf(game[0],1));
}


//TODO when exipres delete game
function matchExpired(gameid: string): void {
  gamesTimers.delete(gameid);
  gameEnd(gameid); 
  console.log(`Match expired for gameId: ${gameid}`);
};

/**
 * Allows to set a timer for a match in a game. Match can last
 * for a certain amount of timer {@see MATCH_DURATION}.
 * If timer fires then another function is called {@see matchExpired}
 * @param gameid id of the game in which a match is starting
 */
function startMatchTimer(gameid: string): void {

  const timerid: ReturnType<typeof setTimeout> = setTimeout(() => {
    matchExpired(gameid)
  }, 10000);

  gamesTimers.set(gameid,timerid);
}

function stopMatchTimer(gameid: string): void {
  const timerid = gamesTimers.get(gameid);
  if(timerid != null){clearTimeout(timerid); gamesTimers.delete(gameid);}
  console.log(`Timer for gameId: ${gameid} removed`);
}

function checkAnswer(game: GameMatch, answer: string[]): boolean {
  console.log("Correct answer: ", answer, "User answer: ", game.matches[0].answer);
  return game.matches[game.matches.length-1].answer.toString() === answer.toString()
}

function startOpponentConnectionTimer(gameid: string): void{
  
  const timerid: ReturnType<typeof setTimeout> = setTimeout(() => {
    opponentConnectionTimeout(gameid)
  }, 10000);

  opponentConnectionTimers.set(gameid,timerid);
}

function opponentConnectionTimeout(gameid: string): void{
  const opponentTimer = opponentConnectionTimers.get(gameid);
  if(opponentTimer != null){clearTimeout(opponentTimer); opponentConnectionTimers.delete(gameid);}
  console.log(`Multyplayer game: ${gameid} failed to start. Opponent missing`);
}



