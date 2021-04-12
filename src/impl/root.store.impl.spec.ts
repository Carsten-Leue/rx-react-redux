import { asyncScheduler, identity, Observable } from "rxjs";
import { observeOn, take } from "rxjs/operators";
import { rxSelect } from "./root.store.impl";

describe("root.store.impl.spec", () => {
  it("should have a rxSelect that unsubscribes", () => {
    let subCount: number = 0;

    const ob$ = new Observable<number>((sub) => {
      subCount++;

      sub.next(1);
      sub.next(2);
      sub.next(3);

      return () => {
        subCount--;
      };
    });

    const value$ = ob$.pipe(
      observeOn(asyncScheduler),
      rxSelect(identity),
      take(2)
    );

    return value$.toPromise().then(() => expect(subCount).toBe(0));
  });
});
