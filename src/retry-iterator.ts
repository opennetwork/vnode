import { isPromise } from "./source";

export async function getNext<T>(iterator: Iterator<T> | AsyncIterator<T>, value?: any): Promise<IteratorResult<T>> {
  let next: IteratorResult<T> | Promise<IteratorResult<T>>;
  try {
    next = iterator.next(value);
    if (isPromise(next)) {
      next = await next;
    }
    if (next.done) {
      if (iterator.return) {
        next = iterator.return(value);
        if (isPromise(next)) {
          next = await next;
        }
      }
    }
    return next;
  } catch (e) {
    if (!iterator.throw) {
      throw e;
    }
    next = iterator.throw(e);
    if (isPromise(next)) {
      next = await next;
    }
    return next;
  }
}
