import { combineEpics, Epic, ofType } from "redux-observable";
import { ignoreElements, mapTo } from "rxjs/operators";
import { ofInitFeature } from "../../impl/feature.module.impl";
import { addSampleAction, ADD_SAMPLE_ACTION } from "./feature.actions";
import { INIT_FEATURE } from "./feature.id";


const addEpic: Epic = (actions$) =>
  actions$.pipe(ofType(ADD_SAMPLE_ACTION), ignoreElements());

const initEpic: Epic = (actions$) =>
  actions$.pipe(ofInitFeature(INIT_FEATURE), mapTo(addSampleAction("init")));

export const sampleEpic: Epic = combineEpics(addEpic, initEpic);
