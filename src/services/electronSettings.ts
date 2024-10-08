import {LiteStorage} from 'utils';

const storage = new LiteStorage('electron');

const electronSettings = {
    get port(): string {
        let port = storage.getString('port');
        if (port) {
            return port;
        }
        port = location.port;
        storage.setString('port', port);
        return port;
    },

    set port(port: string) {
        storage.setString('port', port);
    },
};

export default electronSettings;
