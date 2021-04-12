import {
  concat,
  defer,
  EMPTY,
  identity,
  MonoTypeOperatorFunction,
  Observable,
  of,
  OperatorFunction,
  pipe,
  UnaryFunction
} from "rxjs";
import { distinctUntilChanged, shareReplay, tap } from "rxjs/operators";

// shortcut to math functions
const { floor, random } = Math;

// random number
const _MAX_INT = Number.MAX_SAFE_INTEGER;

export type Consumer<T> = UnaryFunction<T, any>;

export type BiFunction<T1, T2, R> = (t1: T1, t2: T2) => R;

/**
 * Returns a value or the default
 *
 * @param aValue - the value
 * @param aDefault - the default
 *
 * @returns the value or the default
 */
export const valueOrDefault = <T>(aValue: T, aDefault: T | undefined) =>
  aValue !== undefined ? aValue : aDefault;

/**
 * Generates a function that returns a property
 *
 * @param aKey - the key
 * @returns extractor function
 */
export const getProperty = <T, K extends keyof T>(
  aValue: T,
  aKey: K,
  aDefault?: T[K] | undefined
): T[K] => (aValue ? valueOrDefault(aValue[aKey], aDefault) : aDefault);

/**
 * Generates a function that returns a property
 *
 * @param aKey - the key
 * @returns extractor function
 */
export const pluckProperty = <T, K extends keyof T>(
  aKey: K,
  aDefault?: T[K] | undefined
): UnaryFunction<T, T[K]> => (aValue) => getProperty(aValue, aKey, aDefault);

export type IsPredicate<T> = (aValue: any | null | undefined) => aValue is T;

export type Predicate<T> = (aValue: T | null | undefined) => boolean;

export type EqualsPredicate<T> = (aLeft: T, aRight: T) => boolean;

export function isEqual<T>(aLeft: T, aRight: T): boolean {
  return aLeft === aRight;
}

/**
 * Returns a function that tests if a value is equal to another value
 *
 * @param aComparison - the value to compare with
 * @returns the predicate
 */
export const isEqualTo = <T, R = T>(
  aComparison: T,
  aTransform?: UnaryFunction<R, T>
): Predicate<R> => {
  // the transform
  const trfrm: UnaryFunction<R, T> = aTransform || (identity as any);
  // execute the operation
  return (aValue) => isEqual(trfrm(aValue), aComparison);
};

/**
 * helper
 */
const internalToString = Object.prototype.toString;

/**
 * Invokes the native toString method
 *
 * @param aValue - value to call for
 * @returns the result of the method
 */
function _applyToString(aValue: any): string {
  return internalToString.apply(aValue);
}

/**
 * Tests if an object is a string
 *
 * @param aValue - value to test
 */
export const isString: IsPredicate<string> = isEqualTo(
  _applyToString(""),
  _applyToString
) as any;

const randomInt = () => floor(random() * _MAX_INT);

/**
 * Returns some random identifier
 *
 * @returns a random identifier
 */
export const hashRandomIdentifier = (): string => `i${randomInt()}`;

/**
 * Checks for nil
 *
 * @param aObject - object to check
 * @returns the return value
 */
export const isNotNil: <T>(aObject: T | null | undefined) => aObject is T = ((
  aValue
) => aValue != null) as any;

/**
 * Checks for nil
 *
 * @param aObject - object to check
 * @returns the return value
 */
export const isNil: (aObject: any) => aObject is null | undefined = ((aValue) =>
  aValue == null) as any;

/**
 * Returns the `shareReplay` operator with a buffer of `1` and `refCount: true`
 *
 * @param scheduler - optional scheduler
 * @returns the operator
 */
const replayLast = <T>(): MonoTypeOperatorFunction<T> =>
  shareReplay<T>({ bufferSize: 1, refCount: true });

/**
 * Implementation of the operator function
 */
function internalCacheLast<T>(
  aSrc$: Observable<T>,
  aShare: MonoTypeOperatorFunction<T>,
  aDistinct: MonoTypeOperatorFunction<T>
): Observable<T> {
  // check if we have a value
  let cachedValue: T;
  let hasValue = false;
  // observable that monitors the last value
  const monitor$ = aSrc$.pipe(
    tap((value) => {
      hasValue = true;
      cachedValue = value;
    })
  );
  // the shared sequence
  const shared$ = monitor$.pipe(aShare);
  // the initial value
  const initial$ = defer(() => (hasValue ? of(cachedValue) : EMPTY));
  // shared with optional initial value
  return concat(initial$, shared$).pipe(aDistinct);
}

/**
 * Operator that will replay the last value of a sequence to potentially many subscribers. The following assertions
 * hold true:
 *
 * - there will be no identical subsequent values
 * - there will be at most one subscription to the original sequence
 * - if there are no more subscriptions to the resulting observable (refcount falls to zero), the operator unsubscribes from the source
 * - if the original sequence has produced at least one value, this value will be the starting
 *
 * This operator differs from `shareReplay(1)` in the following way (in addition to ensuring a unique sequence):
 * - if the source observable is hot, then `shareReplay(1)` will never unsubscribe even if its subscriptions fall to zero. `cacheLast` will unsubscribe
 * - if the source observable is cold but still producing values when subscriptions fall to zero, then `shareReplay(1)` will not unsubscribe and will not cancel the sequence. `cacheLast` will unsubscribe and cancel the sequence.
 *
 * This operator differs from `shareReplay({bufferSize: 1, refCount: true})` in the following way (in addition to ensuring a unique sequence):
 * - if subscriptions fall to zero, then with `shareReplay` the first value that
 *   subsequent subscriptions will get is the first value of a new subscription to the source sequence. With `cacheLast` the first value will
 *   be the last value of the previous subscription.
 *
 * @param aEqualFunction - compares the subsequent value
 * @param scheduler - optional scheduler
 *
 * @returns the cached operator
 */
function cacheLast<T>(
  aEqualFunction: EqualsPredicate<T> = isEqual
): MonoTypeOperatorFunction<T> {
  // the operators
  const opDistinct = distinctUntilChanged<T>(aEqualFunction);
  const opShareReplay = replayLast<T>();
  // returns the operator
  return (aSrc$) => internalCacheLast<T>(aSrc$, opShareReplay, opDistinct);
}

/**
 * Operator that caches the result of a previous operator and
 * monitors the result for changes
 *
 * @param opFct - the operator function to dispatch to
 * @param cmp - optional comparator to compare the results
 *
 * @returns the memoized function
 */
export const rxMemoize = <T, R>(
  opFct: OperatorFunction<T, R>,
  cmp?: EqualsPredicate<R>
) => pipe(opFct, cacheLast<R>(cmp));

export const constGenerator = <T>(aValue: T) => () => aValue;
