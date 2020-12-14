package com.matchservice.matchservice.controller;

import com.google.gson.Gson;
import com.matchservice.matchservice.model.Ingredient;
import com.matchservice.matchservice.repository.*;
import com.matchservice.matchservice.config.GameModalities;
import com.matchservice.matchservice.model.Recipe;
import com.matchservice.matchservice.service.RecipeServiceImpl;
import com.matchservice.matchservice.utils.Utils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.json.JSONObject;

import java.util.*;

@RestController
public class MatchserviceApi {

    private static GameModalities modalities;
    @Autowired
    private RecipeServiceImpl recipeService;

//    @GetMapping(value = "/match", path = "{type}", produces = "application/json")
//    public ResponseEntity<?> getMatch(@PathVariable("type") GameModalities type) {}

    /****
     * This endpoint produces a new {@link Match} according to some parameters.
     * @return
     */
    @GetMapping(path = "match", produces = "application/json")
    public ResponseEntity<?> produceMatch(@RequestParam("type") String type) {
        JSONObject header;
        String body;
        JSONObject response;

        List<Recipe> recipes = recipeService.getRecipes();
        List<Ingredient> ingredients = recipeService.getIngredients();
        Random rand = new Random();
        var selectedRecipe = recipes.get(rand.nextInt(recipes.size()));
        var scrambledSteps = Utils.scramble(selectedRecipe.getSteps());

        //TODO scramble ingredients = recipe ingredients - few of them replaced with someother ones different than actual ones
        var ingredientsPool = selectedRecipe.getIngredients();
        var scrambledIngredients = Utils.scramble(selectedRecipe.getIngredients());
        System.out.println("Building new match of type: " + type);
        switch (type) {
            case "rearrange_steps":
                List<String> answer = selectedRecipe.getSteps();
                MatchImpl match = new MatchImpl(
                        null,
                        GameModalities.rearrange_steps.toString(),
                        selectedRecipe.getTitle(),
                        Collections.emptyList(),
                        scrambledSteps,
                        answer);
                Gson gson = new Gson();
                body = gson.toJson(match);
                return ResponseEntity
                        .ok()
                        .body(body);

            case "select_ingredients":
                List<String> answer_ingredients = selectedRecipe.getIngredients();

                break;
            default:

        }

//        header = new JSONObject()
//                .put("status", "ok")
//                .put("status_code", HttpStatus.OK.value())
//                .put("description", "votes retrieved");
//        body = new JSONArray();
//        response = new JSONObject()
//                .put("header", header)
//                .put("body", response);
//        return ResponseEntity
//                .ok()
//                .body(response.toString());
//    }
        return ResponseEntity
                .badRequest()
                .body("ERROR");
    }
}
