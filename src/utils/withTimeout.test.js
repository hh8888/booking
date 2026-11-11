import withTimeout from './withTimeout';

test('withTimeout rejects after specified time', async () => {
  jest.useFakeTimers();
  const never = new Promise(() => {});
  const p = withTimeout(never, 1000);
  let error = null;
  await Promise.resolve();
  jest.advanceTimersByTime(1000);
  try {
    await p;
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(Error);
});
