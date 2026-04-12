function generateLevel(mapsize = 4, rounds = 0) {
  if (rounds == 0) {
    rounds = Math.round(mapsize * Math.random() * 5)
  }
  let map = []
  let lavaChance = 0.25 + (Math.random() * 0.5)
  for (let i = 0; i < mapsize; i++) {
    map.push([])
    for (let j = 0; j < mapsize; j++) {
      map[map.length - 1].push(Math.random() < lavaChance ? 1 : 2)
    }
  }
  let player = {x: Math.floor(Math.random() * mapsize), y: Math.floor(Math.random() * mapsize)}
  let playerStart = {...player}
  for (let i = 0; i < rounds; i++) {
    let xv = 0
    let yv = 0
    if (Math.random() < 0.5) {
      xv = 1
    } else {
      yv = 1
    }
    if (Math.random() < 0.5) {
      xv *= -1
      yv *= -1
    }
    if (player.x + xv < 0 || player.y + yv < 0 || player.x + xv >= mapsize || player.y + yv >= mapsize) {
      i -= 0.9
      continue
    }
    player.x += xv
    player.y += yv
    let block = map[player.x][player.y]
    let random = Math.random()
    if (block == 1 || block == 2) {
      block = random < 1/3 ? 0 : (random < 2/3 ? 3 : 6)
    } else if ([3,4].includes(block)) {
      block++
    } else if ([6,7].includes(block) && random < 1/5) {
      block++
    } else if (block == 5) {
      block = random < 1/4 ? 6 : (random < 2/4 ? 7 : (random < 3/4 ? 8 : 0))
    } else if (block == 8) {
      block = random < 5/100 ? 0 : (random < 50/100 ? 8 : (random < 75/100 ? 6 : 7))
    }
    map[player.x][player.y] = block
  }

  let generateAgain = true
  for (let data of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    let xv = data[0]
    let yv = data[1]
    if (player.x + xv >= 0 && player.y + yv >= 0 && player.x + xv < mapsize && player.y + yv < mapsize && map[player.y + yv][player.x + xv] == 0) {
      generateAgain = false
    }
  }
  for (let i of map) {
    for (let j of i) {
      if (j > 3) { // cannot be all normal blocks
        generateAgain = false
      }
    }
  }
  if (generateAgain) {
    return generateLevel(...arguments)
  }
  return [map, {"player": {x: player.y, y: player.x}}]
}
export {generateLevel}
