import { filter, first, map, mergeMapTo, tap } from "rxjs/operators";
import {
  createReduxRootStore,
  rxSelect,
  rxStore
} from "../impl/root.store.impl";
import {
  sampleFeatureModule,
  selectSampleFeature
} from "../sample/feature/feature";
import { addSampleAction } from "../sample/feature/feature.actions";
import { initFeatureModule, selectInitFeature } from "../sample/init/feature";


describe("feature.module.spec", () => {
  it("should listen for an init call", () => {
    // new store
    const store = createReduxRootStore({});
    store.addFeatureModule(initFeatureModule);

    const store$ = rxStore(store);
    // check the first emission
    const initState$ = store$.pipe(rxSelect(selectInitFeature), first());

    const test$ = initState$.pipe(
      map((state) => expect(state).toEqual("init"))
    );

    return test$.toPromise();
  });

  fit("should be able to add state to a feature store", () => {
    // new store
    const store = createReduxRootStore({});
    store.addFeatureModule(sampleFeatureModule);

    const store$ = rxStore(store);

    // check the first emission
    const initState$ = store$.pipe(rxSelect(selectSampleFeature), first());

    const sampleState$ = store$.pipe(rxSelect(selectSampleFeature), first());

    const SAMPLE_DATE = "SAMPLE_DATA";

    // then trigger new state
    const action$ = initState$.pipe(
      map(() => store.dispatch(addSampleAction(SAMPLE_DATE)))
    );

    // check new state
    const newState$ = action$.pipe(
      mergeMapTo(sampleState$),
      filter(data => data == SAMPLE_DATE),
      first(),
      map((data) => expect(data).toEqual(SAMPLE_DATE))
    );

    return newState$.toPromise();
  });

  it("should register a feature store with initial state", () => {
    // new store
    const store = createReduxRootStore({});
    store.addFeatureModule(sampleFeatureModule);

    const store$ = rxStore(store);

    // check the first emission
    const initState$ = store$.pipe(
      rxSelect(selectSampleFeature),
      first(),
      map((data) => expect(data).toEqual("default"))
    );

    return initState$.toPromise();
  });
});
