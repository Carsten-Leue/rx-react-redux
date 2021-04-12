import { Epic, ofType } from "redux-observable";
import { ignoreElements } from "rxjs/operators";
import { ADD_SAMPLE_ACTION } from "./feature.actions";

export const sampleEpic: Epic = (actions$) =>
  actions$.pipe(ofType(ADD_SAMPLE_ACTION), ignoreElements());
