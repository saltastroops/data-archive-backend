import mysql from 'mysql'


class Database {
    public connection: any;

    private config = {
        database : process.env.DATABASE_NAME,
        host     : process.env.DATABASE_HOST,
        password : process.env.DATABASE_PASSWORD,
        user     : process.env.DATABASE_USER
    };

    constructor() {
        this.connection = mysql.createConnection( this.config );
    }
    query( sql: string, args: Array<string | boolean | number> = [] ): any {
        return new Promise( ( resolve, reject ) => {
            this.connection.query( sql, args, ( err: any, rows: any ) => {
                if ( err ) {
                    return reject(err);
                }
                resolve( rows );
            } );
        } );
    }
    public close() {
        return new Promise( ( resolve, reject ) => {
            this.connection.end( (err: any) => {
                if ( err ) {
                    return reject(err);
                }
                resolve();
            } );
        } );
    }
}
export default Database;