export function setupCounter(element: HTMLButtonElement) {
  const display = (count: unknown) => {
    element.innerHTML = `count is ${count}`
  }

  setInterval(() => {
    fetch("/api/count")
      .then(async (result) => display(await result.text()))
      .catch(error => display(`error: ${error}`));
  }, 1000);

  display("fetching");
}
