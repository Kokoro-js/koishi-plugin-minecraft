import { Quester } from "koishi";

export interface MCUser {
  id: string;
  name: string;
}
export default class MCAPI {
  http: Quester;
  constructor(http: Quester) {
    this.http = http;
  }

  servers = "https://sr-api.sfirew.com/server";
  render = "https://visage.surgeplay.com";
  mojang = "https://api.mojang.com";

  async getUser(username: string) {
    if (!username) throw new TypeError(`No Username or UUID Provided!`);
    const data = await this.http.get<MCUser>(
      `${this.mojang}/users/profiles/minecraft/${username}`,
    );
    if (data.name == undefined) throw new Error(`Can not find such player!`);
    return data;
  }

  renderView(user: MCUser) {
    return {
      skinBust: `${this.render}/bust/${user.id}`,
      skinView: `${this.render}/full/${user.id}`,
      download: `${this.render}/processedskin/${user.id}`,
      headView: `${this.render}/head/${user.id}`,
      headFace: `${this.render}/face/${user.id}`,
      gethead: {
        new: `/give @p minecraft:player_head{SkullOwner:"${user.name}"}`,
        old: `/give @p minecraft:skull 1 3 {SkullOwner:"${user.name}"}`,
      },
    };
  }
}
