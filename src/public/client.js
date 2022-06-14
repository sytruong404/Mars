let store = Immutable.fromJS({
  rovers: ["Curiosity", "Opportunity", "Spirit", "Perseverance"],
  activeRover: "",
  roversData: [
    { name: "Curiosity", photos: [], manifest: {} },
    { name: "Opportunity", photos: [], manifest: {} },
    { name: "Spirit", photos: [], manifest: {} },
    { name: "Perseverance", photos: [], manifest: {} },
  ],
});

// updateStore is not a pure function because it changes the global state
const updateStore = newState => {
  store = store.mergeDeep(newState);
};

// add our markup to the page
const root = document.getElementById("root");

const render = async (root, state) => {
  root.innerHTML = App(state);
};

// HOF to create content
const App = state => {
  const { activeRover, roversData, rovers } = state.toJS();
  const activeRoverData =
    activeRover && roversData.find(el => el.name === activeRover);

  return `
  <header>Mars Rovers</header>
  <main>
    <aside>
      <nav>${roverNavigation(rovers, activeRover)}</nav>
    </aside>
    <section>
      ${activeRoverData && roverPhotos(activeRoverData.photos)}
    </section>
    <article>${activeRoverData && roverManifest(activeRoverData.manifest)
    }</article>
  </main>
    `;
};

// listening for load event because page should load before any JS is called
// DOM event listener is not a pure function because it accesses and changes the global store with update and render
window.addEventListener("load", async () => {
  const merged = await loadRoversData();
  updateStore({ roversData: merged });
  render(root, store);
});

// DOM event listener is not a pure function because it accesses and changes the global store with update and render
root.addEventListener("click", async event => {
  const rovers = store.getIn(["rovers"]);
  if (rovers.includes(event.target.innerHTML))
    updateStore({ activeRover: event.target.innerHTML });
  render(root, store);
  slider();
});

// ------------------------------------------------------  COMPONENTS

// Pure HOF function that render a list of UI elements
const listOfElements = (arr, cb, ...args) =>
  `${arr.map(el => cb(el, ...args)).join("")}`;

// Pure HOF function that render a list of UI elements from Object key:value pairs
const listOfElementsFromObj = (arr, cb, ...args) =>
  `${arr.map(([key, value]) => cb(key, value, ...args)).join("")}`;

// Pure HOF function that renders information from the store
const roverNavigation = (rovers, activeRover) => {
  const roverNavElement = (rover, activeRover) =>
    rover === activeRover
      ? `<span class="active">${rover}</span>`
      : `<span>${rover}</span>`;

  return listOfElements(rovers, roverNavElement, activeRover);
};

// Pure HOF function that renders information requested from the backend
const roverPhotos = photos => {
  const photoElement = photo => `<img class="slide" src="${photo.img_src}"/>`;

  return listOfElements(photos, photoElement);
};

// Pure HOF function that renders information requested from the backend
const roverManifest = manifest => {
  const manifestElement = (key, value) => `
  <p>
  ${key.replace("_", " ").replace("max", "latest")}
  <span>${value}</span>
  </p>`;

  return listOfElementsFromObj(Object.entries(manifest), manifestElement);
};

// ------------------------------------------------------  API CALLS

const getRoverPhotos = async rover => {
  try {
    const response = await fetch(`http://localhost:3000/photos/${rover}`);
    const roverPhotos = await response.json();

    const photos = roverPhotos.photos.latest_photos;
    return { name: rover, photos };
  } catch (error) {
    throw error; // re-throw the error unchanged
  }
};

const getRoverManifest = async rover => {
  try {
    const response = await fetch(`http://localhost:3000/manifest/${rover}`);
    const roverManifest = await response.json();

    const manifest = roverManifest.manifest.photo_manifest;
    delete manifest.photos;

    return { name: rover, manifest };
  } catch (error) {
    throw error; // re-throw the error unchanged
  }
};

// async HOF function to load all the data from the API at page load
const loadRoversData = async () => {
  const mergeRoverData = (name, data) => {
    const output = data.filter(el => el.name === name);
    return Object.assign(output[0], output[1]);
  };

  try {
    const rovers = store.getIn(["rovers"]);
    const getManifestPromises = rovers.map(name => getRoverManifest(name));
    const getPhotosPromises = rovers.map(name => getRoverPhotos(name));
    const results = await Promise.all([
      ...getManifestPromises,
      ...getPhotosPromises,
    ]);

    return rovers.map(name => mergeRoverData(name, results));
  } catch (error) {
    throw error; // re-throw the error unchanged
  }
};

// ---------CAROUSEL from W3C website (https://www.w3schools.com/w3css/w3css_slideshow.asp)
// transformed into a pure function IIFE that stores a function reference to slider
const slider = (() => {
  let slideIndex = 0;
  return () => {
    let x = document.getElementsByClassName("slide");
    for (let i = 0; i < x.length; i++) {
      x[i].style.display = "none";
    }
    slideIndex++;
    if (slideIndex > x.length) {
      slideIndex = 1;
    }
    x[slideIndex - 1].style.display = "block";
    setTimeout(slider, 10000);
  };
})();
