var overlay = null,
    frame = null

var previousCardIndex = -1
var previousCardData = null

window.__PREVYOU_LOADED = true

// Event send by the inner `<object>` script
window.addEventListener('message', e => {
    if (e.data && e.data.type === 'find_card') {
        findCard()
    }
})

// Event send by the extension popup
chrome.runtime.onMessage.addListener((request) => {
    if (request.type == 'popup') {
        //console.log(request);
        showPopup()
    } else if (request.type === 'close_popup') {
        hidePopup()
    }
    return true
})

function showPopup() {
    if (document.querySelector('.py-popup-overlay')) {
        hidePopup()
        return false
    }

    overlay = document.createElement('div')
    frame = document.createElement('object')

    overlay.className = 'py-popup-overlay'
    frame.className = 'py-popup-container'
    frame.setAttribute('scrolling', 'no')
    frame.setAttribute('frameborder', '0')

    // file need to be added in manifest web_accessible_resources
    frame.data = chrome.runtime.getURL('popup.html')
    overlay.appendChild(frame)
    document.body.appendChild(overlay)

    overlay.addEventListener('click', hidePopup)
}

function hidePopup() {
    // Remove EventListener
    overlay.removeEventListener('click', hidePopup)

    // Remove the elements:
    document.querySelector('.py-popup-overlay').remove()

    // Clean up references:
    overlay = null
    frame = null
}

function updateVideoCard(target, data) {
    let previousData = {}

    const thumbnail = target.querySelector('.ytd-thumbnail > img')
    previousData['thumbnail'] = thumbnail.src
    thumbnail.src = data.thumbnail

    // Finally, set the channel's thumbnail in the preview
    let avatar = target.querySelector('.yt-spec-avatar-shape img')
    if (avatar) {
        previousData['avatar'] = avatar.src
        avatar.src = data.avatar
    }

    const title = target.querySelector('#video-title')
    previousData['title'] = title.textContent
    title.textContent = data.title

    let channelName = target.querySelector('.ytd-channel-name a')
    if (!channelName) {
        channelName = target.querySelector('.ytd-channel-name')
    }
    previousData['channel']
    channelName.textContent = data.channel

    return previousData
}

function findCard() {
    // Select a random a card in between a range
    let cardPositionIndex = 0

    const activeScreen = document.querySelector('[role="main"]')
    // Target only ytd-rich-item-renderer element and not ytd-rich-item-renderer with id content for the main page
    let cards = activeScreen.querySelectorAll('ytd-rich-grid-media, ytd-rich-grid-slim-media')
    if (cards.length === 0) {
        cards = activeScreen.getElementsByTagName('ytd-grid-video-renderer')
    }
    if (cards.length === 0) {
        cards = activeScreen.getElementsByTagName('ytd-compact-video-renderer')
    }

    if (previousCardIndex > -1) {
        updateVideoCard(cards[previousCardIndex], previousCardData)
        previousCardData = null
    }

    chrome.storage.local.get('thumbnailProperties', (result) => {

        if (result.thumbnailProperties.shuffle) {
            const min = 1
            const max = 12
            cardPositionIndex = Math.floor(Math.random() * (max - min + 1)) + min
        }
        previousCardIndex = cardPositionIndex
        let target = cards[cardPositionIndex]

        // Channel's thumbnail management
        let channelThumbnailFromExtension = result.thumbnailProperties.channelThumbnail
        let channelThumbnailFromYoutube = document.querySelector('#avatar-btn .yt-img-shadow')

        // By default, we get the image from the extension
        let channelThumbnailValue = channelThumbnailFromExtension

        // But if there's no image then we try to get the real YT thumbnail
        // => Thumbnail from YT is null if not logged in so we check for it
        if (channelThumbnailValue == null && channelThumbnailFromYoutube != null) {
            channelThumbnailValue = channelThumbnailFromYoutube.src
        }

        previousCardData = updateVideoCard(target, {
            thumbnail: result.thumbnailProperties.thumbnail,
            avatar: channelThumbnailValue,
            title: result.thumbnailProperties.title,
            channel: result.thumbnailProperties.channelName
        })

        highlightTarget(target)

        hidePopup()
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Highlight and scroll to the target
async function highlightTarget(target) {
    window.scrollTo(0, 0)
    const thumbnailWrapper = target.querySelector('ytd-thumbnail')
    
    // Create the border overlay 
    const overlay = document.createElement('div')
    thumbnailWrapper.appendChild(overlay)
    overlay.style.position = 'absolute'
    overlay.style.top = '-2px'
    overlay.style.left = '-2px'
    overlay.style.width = '100%'
    overlay.style.height = '100%'
    overlay.style.transition = 'all 1s linear'
    overlay.style.borderRadius = '20px'
    overlay.style.border = '3px solid #6116ff'
    overlay.style.opacity = '0'

    // scroll to the target
    let headerHeight = 0
    const bbTarget = target.getBoundingClientRect()
    const masterHeader = document.querySelector('#masthead-container')
    const filterBar = document.querySelector('#chips-wrapper')
    
    if (masterHeader) headerHeight += masterHeader.offsetHeight
    if (filterBar) headerHeight += filterBar.offsetHeight
    
    window.scrollTo(0, bbTarget.y - headerHeight - 4)

    // Start a basic toggle opacity animation
    await sleep(100)
    overlay.style.opacity = '1'

    await sleep(1000)
    overlay.style.opacity = '0'

    await sleep(1000)
    thumbnailWrapper.removeChild(overlay)
}

showPopup()
