let currentsong = new Audio();
let songs = [];
let currFolder = "";
let currentSongIndex = 0;
let albums = [];
let currentAlbumIndex = 0;
let autoPlayEnabled = false; // Flag to check if Play All is clicked

// Format time from seconds to mm:ss
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = remainingSeconds.toString().padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

// Fetch album information from the HTML or server
async function getAlbums() {
    const albumElements = document.querySelectorAll('.card');
    albums = Array.from(albumElements).map(album => ({
        folder: album.dataset.folder,
        name: album.querySelector('h2').textContent.trim(),
    }));
    currentAlbumIndex = 0; // Reset current album index
}

// Fetch songs from a given folder
async function getSongs(folder) {
    try {
        currFolder = folder;
        let response = await fetch(`http://127.0.0.1:5500/${folder}/`);
        let text = await response.text();

        let div = document.createElement("div");
        div.innerHTML = text;

        let as = div.getElementsByTagName("a");
        songs = [];

        // Collect all .mp3 files from the folder
        for (let index = 0; index < as.length; index++) {
            const element = as[index];
            if (element.href.endsWith(".mp3")) {
                songs.push(decodeURIComponent(element.href.split(`${folder}/`)[1]));
            }
        }

        // Clear existing song list
        let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0];
        songUL.innerHTML = "";

        let htmlContent = '';
        // Create new song list items
        for (const song of songs) {
            htmlContent += `<li> 
                <img class="invert" src="music.svg" alt="">
                <span class="song-name">${song.replaceAll("%20", " ")}</span>
                <img class="invert" src="play.svg" alt="">
            </li>`;
        }
        songUL.innerHTML = htmlContent;

        // Add click event listeners to song items
        Array.from(songUL.getElementsByTagName("li")).forEach((e, index) => {
            e.addEventListener("click", () => {
                let songNameElement = e.querySelector(".song-name");
                if (songNameElement) {
                    const songName = songNameElement.textContent.trim();
                    currentSongIndex = index; // Update current song index
                    playMusic(songName); // Play the selected song
                }
            });
        });
    } catch (error) {
        console.error("Error fetching songs:", error);
        return [];
    }
}

// Play the specified track
const playMusic = (track, pause = false) => {
    currentsong.src = `${currFolder}/` + track; // Set the current song source
    if (!pause) {
        currentsong.play(); // Play the song unless paused
        play.src = "pause.svg"; // Update play button icon
    }
    document.querySelector(".songinfo").innerHTML = decodeURI(track);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";

    currentsong.removeEventListener("ended", autoPlayNextSong); // Remove old event listener
    if (autoPlayEnabled) {
        currentsong.addEventListener("ended", autoPlayNextSong); // Add event listener for autoplay
    }
};

// Automatically play the next song or album
const autoPlayNextSong = async () => {
    if (currentSongIndex < songs.length - 1) {
        currentSongIndex++; // Move to the next song in the current album
        playMusic(songs[currentSongIndex]);
    } else if (currentAlbumIndex < albums.length - 1) {
        currentAlbumIndex++; // Move to the next album
        await loadAndPlayNextAlbum();
    } else {
        console.log("End of all albums reached."); // End of playlist
    }
};

// Play the next song manually
const playNextSong = () => {
    if (currentSongIndex < songs.length - 1) {
        currentSongIndex++;
        playMusic(songs[currentSongIndex]);
    } else if (currentAlbumIndex < albums.length - 1) {
        currentAlbumIndex++;
        loadAndPlayNextAlbum();
    } else {
        console.log("End of playlist reached."); // End of playlist
    }
};

// Play the previous song manually
const playPreviousSong = () => {
    if (currentSongIndex > 0) {
        currentSongIndex--;
        playMusic(songs[currentSongIndex]);
    } else {
        console.log("This is the first song in the playlist."); // Already at the first song
    }
};

// Load and play the next album
async function loadAndPlayNextAlbum() {
    const nextAlbum = albums[currentAlbumIndex];
    if (nextAlbum) {
        await getSongs(`songs/${nextAlbum.folder}`); // Load songs from the next album
        currentSongIndex = 0; // Start from the first song of the new album
        playMusic(songs[currentSongIndex]);
    }
}

// Main initialization function
async function main() {
    await getAlbums(); // Load albums first
    await getSongs("songs/foryousongs"); // Load songs from the first album
    playMusic(songs[0], true); // Start with the first song paused

    play.addEventListener("click", () => {
        if (currentsong.paused) {
            currentsong.play();
            play.src = "pause.svg"; // Change icon to pause
        } else {
            currentsong.pause();
            play.src = "play.svg"; // Change icon to play
        }
    });

    // Next and previous song button event listeners
    document.getElementById("next").addEventListener("click", () => {
        playNextSong();
    });

    document.getElementById("previous").addEventListener("click", () => {
        playPreviousSong();
    });

    // Update the song time display during playback
    currentsong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${formatTime(currentsong.currentTime)} / ${formatTime(currentsong.duration)}`;
        document.querySelector(".circle").style.left = (currentsong.currentTime / currentsong.duration) * 100 + "%";
    });

    // Seek bar functionality
    document.querySelector(".seekbar").addEventListener("click", e => {
        const seekBarWidth = e.target.getBoundingClientRect().width;
        const offsetX = e.offsetX;
        document.querySelector(".circle").style.left = (offsetX / seekBarWidth) * 100 + "%";
        currentsong.currentTime = (currentsong.duration * (offsetX / seekBarWidth));
    });

   

    // Play All button functionality
    document.querySelector('.Playall-button a').addEventListener('click', () => {
        autoPlayEnabled = true; // Enable autoplay when Play All is clicked
        currentAlbumIndex = 0; // Start from the first album
        currentSongIndex = 0; // Start from the first song of the first album
        playMusic(songs[currentSongIndex]);
    });

    // Card click event to play songs from a selected album
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            const albumName = item.currentTarget.querySelector('h2').textContent; // Get album name from the card
            const quickPicksHeader = document.querySelector('.song-lists h2'); // Select the h2 element for "Quick picks"

            if (quickPicksHeader) {
                quickPicksHeader.textContent = albumName; // Update "Quick picks" with album name
            }

            await getSongs(`songs/${item.currentTarget.dataset.folder}`); // Load songs from the selected album
            currentSongIndex = 0; // Reset to first song in the new album
            playMusic(songs[0]); // Play the first song
        });
    });
}

// Fetch and display albums in the card container
async function displayPlaylist() {
    try {
        let response = await fetch(`http://127.0.0.1:5500/songs/`);
        let text = await response.text();
        let div = document.createElement("div");
        div.innerHTML = text;
        let anchors = div.getElementsByTagName("a");
        let cardContainer = document.querySelector(".cardContainer");

        let array = Array.from(anchors);
        for (let index = 0; index < array.length; index++) {
            const e = array[index];

            if (e.href.includes("/songs")) {
                let folder = e.href.split("/").slice(-1)[0];

                try {
                    let response = await fetch(`http://127.0.0.1:5500/songs/${folder}/info.json`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    let data = await response.json();

                    // Create a card for each album
                    cardContainer.innerHTML += `
                        <div data-folder="${folder}" class="card">
                            <div class="play">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="black"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 20V4L19 12L5 20Z" fill="black" />
                                </svg>
                            </div>
                            <img src="songs/${folder}/cover.png">
                            <h2>${data.title || 'Untitled'}</h2>
                            <p>${data.description || 'No description available.'}</p>
                        </div>`;    
                } catch (error) {
                    console.error(`Failed to load info.json for ${folder}:`, error);
                }
            }
        }
    } catch (error) {
        console.error("Error fetching albums:", error);
    }

    // Add click event listeners to album cards
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            const albumName = item.currentTarget.querySelector('h2').textContent; // Get album name from the card
            const quickPicksHeader = document.querySelector('.song-lists h2'); // Select the h2 element for "Quick picks"

            if (quickPicksHeader) {
                quickPicksHeader.textContent = albumName; // Update "Quick picks" with album name
            }

            await getSongs(`songs/${item.currentTarget.dataset.folder}`); // Load songs from the selected album
            currentSongIndex = 0; // Reset to first song in the new album
            playMusic(songs[0]); // Play the first song
        });
    });
}
displayPlaylist(); // Call to display playlist
main(); // Call to start the main logic

